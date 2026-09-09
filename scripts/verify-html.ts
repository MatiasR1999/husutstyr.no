import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import site from '../site.config';
import { articlePath, canonicalUrl } from '../src/lib/seo/urls';
import { buildArticleGraph, graphSchema } from '../src/lib/seo/json-ld';
import { readRuntimeConfig } from '../src/lib/config';
import { startQaServer } from './qa-server';

const exec = promisify(execFile);
const runtime = readRuntimeConfig({ SEO_QA_MODE: 'true' });
const route = articlePath(site.qa.article.categorySlug, site.qa.article.slug);
const canonical = canonicalUrl(site.qa.identity.url, route);
const evidence = process.env.QA_EVIDENCE_DIR ?? 'docs/qa';
const report: string[] = [`TIME: ${new Date().toISOString()}`, `NODE: ${process.version}`, `URL: ${canonical}`];
await mkdir(evidence, { recursive: true });

async function curl(label: string, url: string, extra: string[] = []) {
  const args = ['--silent', '--show-error', '--max-time', '30', '--dump-header', `${evidence}/${label}.headers.txt`, '--output', `${evidence}/${label}.html`, '--write-out', '%{http_code}', ...extra, url];
  const result = await exec('curl', args, { maxBuffer: 2_000_000 });
  report.push(`COMMAND: curl ${args.join(' ')}`);
  return { status: Number(result.stdout), html: await readFile(`${evidence}/${label}.html`, 'utf8'), headers: await readFile(`${evidence}/${label}.headers.txt`, 'utf8') };
}

const server = await startQaServer('html');
try {
  for (const [label, userAgent] of [['article-curl', 'curl'], ['article-browser-agent', 'Mozilla/5.0']] as const) {
    const response = await curl(label, canonical, ['--user-agent', userAgent]);
    assert.equal(response.status, 200);
    const $ = load(response.html);
    assert.equal($('title').length, 1);
    assert.equal($('head > title').text(), site.qa.article.seo.title);
    assert.equal($('meta[name="description"]').length, 1);
    assert.equal($('head > meta[name="description"]').attr('content'), site.qa.article.seo.description);
    assert.equal($('link[rel="canonical"]').length, 1);
    assert.equal($('head > link[rel="canonical"]').attr('href'), canonical);
    assert.equal($('article').length, 1);
    const article = $('article').clone(); article.find('script, template, [hidden]').remove();
    for (const paragraph of site.qa.article.body) assert.ok(article.find('p').toArray().some(element => $(element).text() === paragraph));
    assert.equal($('script[type="application/ld+json"]').length, 1);
    const graph = graphSchema.parse(JSON.parse($('script[type="application/ld+json"]').text()));
    assert.deepEqual(graph, buildArticleGraph(runtime, {...site.qa.article,author:{...site.qa.article.author,bio:site.qa.markers.bio,expertise:[site.qa.markers.expertise]}}));
    assert.ok($('meta[name="robots"]').attr('content')?.includes('noindex'));
    assert.match(response.headers, /x-robots-tag: noindex/i);
    report.push(`PASS: ${label} body is visible server HTML, not script-only data.`);
    report.push(`PASS: ${label} contains exactly one expected title, description and absolute canonical.`);
    report.push(`PASS: ${label} contains the validated Article, Person, Organization and BreadcrumbList graph.`);
    report.push(`PASS: ${label} has noindex in both metadata and HTTP headers.`);
    report.push(`SHA256: ${label}.html ${createHash('sha256').update(response.html).digest('hex')}`);
  }
  for (const [label, header] of [['forwarded-host', 'X-Forwarded-Host: attacker.invalid'], ['host', 'Host: attacker.invalid']] as const) {
    const response = await curl(`untrusted-${label}`, canonical, ['--header', header]);
    assert.ok([200,404].includes(response.status));
    const $ = load(response.html);
    for (const element of $('link[rel="canonical"]').toArray()) assert.equal($(element).attr('href'), canonical);
    if (response.status===200) assert.equal($('link[rel="canonical"]').length,1);
    report.push(`PASS: Untrusted ${label} cannot replace the configured canonical origin.`);
  }
  for (const [label, path] of [['missing', `${route}-missing`], ['wrong-category', `/wrong/${site.qa.article.slug}`]] as const) {
    const response = await curl(label, new URL(path, site.qa.identity.url).href);
    assert.equal(response.status, 404);
    assert.equal(load(response.html)('link[rel="canonical"]').length, 0);
    report.push(`PASS: ${label} returns an actual 404 without canonical.`);
  }
  const redirect = await curl('redirect', canonical + '/?page=1');
  assert.equal(redirect.status, 301);
  const location = /^location:\s*(.+)$/im.exec(redirect.headers)?.[1]?.trim();
  assert.ok(location);
  assert.equal(new URL(location, canonical).href, canonical);
  const followed = await curl('redirect-followed', canonical + '/?page=1', ['--location', '--max-redirs', '1']);
  assert.equal(followed.status, 200);
  report.push('PASS: Slash and page=1 normalize in one HTTP 301 to the final canonical URL.');
} finally { await server.stop(); }

for (const preview of [false, true]) {
  const mode = preview ? 'preview' : 'production';
  const production = await startQaServer(`${mode}-denied`, false, preview);
  try {
    for (const [suffix, extra] of [['html', []], ['rsc', ['--header', 'RSC: 1']]] as const) {
      const label = `${mode}-${suffix}-denied`;
      const response = await curl(label, canonical, [...extra]);
      assert.equal(response.status, 404);
      assert.ok(!response.html.includes(site.qa.article.body[0]));
      if (preview) assert.match(response.headers, /x-robots-tag: noindex/i);
      report.push(`PASS: ${label} rejects the previously built QA fixture.`);
    }
  } finally { await production.stop(); }
}

report.push('STATUS: Raw response verification passed against the restricted Neon published-revision view.');
await writeFile(`${evidence}/html-verification.txt`, report.join('\n') + '\n');
console.log(`PASS: Raw curl response checks saved to ${evidence}/html-verification.txt`);
