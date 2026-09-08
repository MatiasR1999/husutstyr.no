import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { cpus, release, platform } from 'node:os';
import { load } from 'cheerio';
import site from '../site.config';
import { articlePath } from '../src/lib/seo/urls';
import { startQaServer } from './qa-server';
import { performanceProfile as profile, percentile75 } from './performance-profile';

interface Metrics { lcp: number; cls: number; ttfb: number; menuInteraction: number; contentInteraction: number }
interface Sample extends Metrics { mode: 'cold' | 'warm'; sample: number; cacheHeader: string | null; jsGzipBytes: number; inlineJsGzipBytes: number }
interface BrowserMeasurements { lcp: number; cls: number; interactions: number[] }
declare global {
  interface Window { __qaMeasurements: BrowserMeasurements }
  interface PerformanceEventTiming { readonly interactionId: number }
  interface PerformanceObserverInit { durationThreshold?: number }
}
const path = articlePath(site.qa.article.categorySlug, site.qa.article.slug);
const url = new URL(path, site.qa.identity.url).href;
const samples: Sample[] = [];
const files: Record<string, number> = {};
await mkdir('docs/qa', { recursive: true });
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('work/playwright');
const { chromium } = await import('@playwright/test');
const browser = await chromium.launch({ headless: true });
const startedAt = new Date().toISOString();

try {
  for (let index = 1; index <= profile.samples; index++) {
    // Only remove generated responses for the single QA article, never source files.
    for (const suffix of ['.html', '.rsc', '.meta']) await rm(`.next/server/app${path}${suffix}`, { force: true });
    const server = await startQaServer(`performance-${index}`);
    try {
      for (const mode of ['cold', 'warm'] as const) {
        const context = await browser.newContext({ viewport: profile.viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: profile.latencyMs, downloadThroughput: profile.downloadBytesPerSecond, uploadThroughput: profile.uploadBytesPerSecond });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpuSlowdown });
        await page.addInitScript(() => {
          window.__qaMeasurements = { lcp: 0, cls: 0, interactions: [] };
          new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__qaMeasurements.lcp = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
          let windowStart = 0, lastShift = 0, windowValue = 0;
          new PerformanceObserver(list => { for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
            if (shift.hadRecentInput) continue;
            if (entry.startTime - lastShift >= 1000 || entry.startTime - windowStart >= 5000) { windowStart = entry.startTime; windowValue = 0; }
            windowValue += shift.value; lastShift = entry.startTime;
            window.__qaMeasurements.cls = Math.max(window.__qaMeasurements.cls, windowValue);
          } }).observe({ type: 'layout-shift', buffered: true });
          new PerformanceObserver(list => { for (const entry of list.getEntries()) { const event = entry as PerformanceEventTiming; if (event.interactionId) window.__qaMeasurements.interactions.push(event.duration); } }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
        });
        const response = await page.goto(url, { waitUntil: 'networkidle' });
        assert.equal(response?.status(), 200);
        assert.equal(response!.headers()['x-nextjs-cache'], mode === 'cold' ? 'MISS' : 'HIT', 'ISR cache state does not match the requested measurement');
        const html = await response!.text();
        const $ = load(html);
        const external = new Set($('script[src]').toArray().filter(element => $(element).attr('nomodule') === undefined).map(element => $(element).attr('src')!));
        const requestedScripts = await page.evaluate(() => performance.getEntriesByType('resource').filter(entry => (entry as PerformanceResourceTiming).initiatorType === 'script').map(entry => entry.name));
        for (const scriptUrl of requestedScripts) external.add(new URL(scriptUrl, url).pathname);
        let externalBytes = 0;
        for (const source of external) {
          assert.ok(source.startsWith('/_next/static/'), 'Unexpected script source in local phase 1');
          const bytes = gzipSync(await readFile(`.next/static/${source.split('/_next/static/')[1]}`)).byteLength;
          files[source] = bytes; externalBytes += bytes;
        }
        const inline = $('script:not([src])').toArray().filter(element => $(element).attr('type') !== 'application/ld+json').map(element => $(element).html() ?? '').join('\n');
        const inlineBytes = gzipSync(inline).byteLength;
        await page.locator('summary').click();
        await page.waitForTimeout(100);
        assert.equal(await page.locator('details').getAttribute('open'), '');
        const menuInteraction = await page.evaluate(() => Math.max(0, ...window.__qaMeasurements.interactions));
        await page.evaluate(() => { window.__qaMeasurements.interactions = []; });
        await page.getByRole('link', { name: site.ui.contents, exact: true }).click();
        await page.waitForTimeout(100);
        assert.equal(new URL(page.url()).hash, `#${site.qa.article.section.id}`);
        const data = await page.evaluate(() => ({ lcp: window.__qaMeasurements.lcp, cls: window.__qaMeasurements.cls, ttfb: (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).responseStart, contentInteraction: Math.max(0, ...window.__qaMeasurements.interactions) }));
        assert.ok(data.lcp > 0, 'Missing LCP measurement');
        samples.push({ mode, sample: index, ...data, menuInteraction, cacheHeader: response!.headers()['x-nextjs-cache'] ?? null, jsGzipBytes: externalBytes + inlineBytes, inlineJsGzipBytes: inlineBytes });
        await context.close();
      }
    } finally { await server.stop(); }
  }
} finally { await browser.close(); }

const groups = (['cold', 'warm'] as const).map(mode => {
  const selected = samples.filter(sample => sample.mode === mode);
  return { mode, lcpMs: percentile75(selected.map(sample => sample.lcp)), cls: percentile75(selected.map(sample => sample.cls)), ttfbMs: percentile75(selected.map(sample => sample.ttfb)), menuMs: percentile75(selected.map(sample => sample.menuInteraction)), contentMs: percentile75(selected.map(sample => sample.contentInteraction)), jsGzipBytes: Math.max(...selected.map(sample => sample.jsGzipBytes)) };
});
const failures = groups.flatMap(group => [
  ...(group.lcpMs > profile.limits.lcpMs ? [`${group.mode} LCP exceeds 2000 ms`] : []),
  ...(group.cls > profile.limits.cls ? [`${group.mode} CLS exceeds 0.1`] : []),
  ...(group.ttfbMs > profile.limits.ttfbMs ? [`${group.mode} TTFB exceeds 600 ms`] : []),
  ...(Math.max(group.menuMs, group.contentMs) > profile.limits.interactionMs ? [`${group.mode} synthetic interaction exceeds 200 ms`] : []),
  ...(group.jsGzipBytes > profile.limits.initialJsGzipBytes ? [`${group.mode} initial JS exceeds ${profile.limits.initialJsGzipBytes} gzip bytes`] : []),
]);
await writeFile('docs/qa/performance.json', JSON.stringify({ startedAt, measuredAt: new Date().toISOString(), runner: { node: process.version, platform: platform(), release: release(), cpu: cpus()[0]?.model }, chromium: browser.version(), profile, groups, samples, files, failures, fieldInp: 'NOT_MEASURED', consentInteraction: 'NOT_APPLICABLE_PHASE_1', note: 'Event durations below the 16 ms observation threshold are reported as 0 (less than 16 ms), not exact zero.' }, null, 2) + '\n');
await writeFile('docs/qa/performance.txt', [
  `TIME: ${new Date().toISOString()}`,
  `CHROMIUM: ${browser.version()}`,
  'PROFILE: 390x844, CPU 4x, 1.6 Mbps down, 750 Kbps up, RTT 150 ms, five samples per cache state.',
  'METHOD: p75 nearest-rank; new browser context for every sample; article ISR files removed before each cold server process.',
  'JS: All unique initial modern Chromium runtime/chunks plus gzipped inline JavaScript; unsupported nomodule fallback is excluded.',
  `JS_LIMIT: ${profile.limits.initialJsGzipBytes} gzip bytes; scope=${profile.scope}.`,
  ...groups.map(group => `RESULT: ${JSON.stringify(group)}`),
  'FIELD_INP: Not measured; synthetic interactions do not establish field INP.',
  'CONSENT: Not applicable in phase 1.',
  ...failures.map(failure => `FAIL: ${failure}`),
  `STATUS: ${failures.length ? 'FAILED' : 'PASSED'}`,
].join('\n') + '\n');
if (failures.length) throw new Error(failures.join('\n'));
console.log('PASS: Performance evidence saved to docs/qa/performance.txt');
