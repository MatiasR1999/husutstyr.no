import { describe, expect, it } from 'vitest';
import site from '../site.config';
import { assertQaContentAllowed, isLocalRequest, parseBoolean, readRuntimeConfig } from '../src/lib/config';
import { normalizeSlug, reserveSlug, slugCandidate } from '../src/lib/slug';
import { activeLocales, localizePath } from '../src/lib/locale';
import { cacheTag } from '../src/lib/cache-tags';

describe('Norwegian slug contract', () => {
  it.each([['\u00c6rlig \u00d8velse \u00c5rlig', 'aerlig-ovelse-arlig'], [' \u00e6 \u00f8 \u00e5 ', 'ae-o-a'], ['A\u030aring', 'aring'], [' A--B! / C ', 'a-b-c']])('normalizes %s deterministically', (input, expected) => expect(normalizeSlug(input)).toBe(expected));
  it('rejects input without an editorial slug', () => expect(() => normalizeSlug('!?')).toThrow());
  it('reserves suffix space within 100 characters', () => {
    const candidate = slugCandidate('x'.repeat(120), 32);
    expect(candidate).toHaveLength(100); expect(candidate.endsWith('-32')).toBe(true);
  });
  it('resolves concurrent reservations through an atomic storage contract', async () => {
    const reserved = new Set<string>();
    const insert = async (candidate: string) => { await Promise.resolve(); if (reserved.has(candidate)) return false; reserved.add(candidate); return true; };
    const slugs = await Promise.all(Array.from({ length: 8 }, () => reserveSlug('samme tittel', insert)));
    expect(new Set(slugs).size).toBe(8); expect(reserved.has('samme-tittel-8')).toBe(true);
  });
});

describe('Configuration and local QA isolation', () => {
  it('defaults network links to off and treats false correctly', () => {
    expect(readRuntimeConfig({}).networkLinks).toBe(false);
    expect(parseBoolean('false', 'flag')).toBe(false);
    expect(parseBoolean('true', 'flag')).toBe(true);
    expect(() => parseBoolean('FALSE', 'flag')).toThrow();
  });
  it('requires explicit QA opt-in and never falls back', () => {
    expect(() => assertQaContentAllowed(readRuntimeConfig({}))).toThrow();
    expect(() => assertQaContentAllowed(readRuntimeConfig({ SEO_QA_MODE: 'true' }))).not.toThrow();
    expect(() => readRuntimeConfig({ SEO_QA_MODE: 'true', VERCEL: '1' })).toThrow();
    expect(() => readRuntimeConfig({ SEO_QA_MODE: 'true', VERCEL_ENV: 'preview' })).toThrow();
  });
  it('limits local fixtures to loopback request URLs', () => {
    expect(isLocalRequest(new URL(site.qa.identity.url))).toBe(true);
    expect(isLocalRequest(new URL('https://localhost.attacker.invalid'))).toBe(false);
  });
  it('provides only the active Norwegian locale', () => {
    expect(activeLocales).toEqual(['nb']); expect(localizePath('/kontroll')).toBe('/kontroll');
  });
  it('namespaces tags by site, locale, resource and escaped identifier', () => {
    expect(cacheTag('article', 'one:two')).toBe(`${site.id}:nb:article:one%3Atwo`);
    expect(cacheTag('article', 'one')).not.toBe(cacheTag('category', 'one'));
  });
});
