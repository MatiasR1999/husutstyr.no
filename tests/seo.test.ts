import { describe, expect, it } from 'vitest';
import site from '../site.config';
import { readRuntimeConfig } from '../src/lib/config';
import { articlePath, canonicalUrl, normalizedRequestUrl } from '../src/lib/seo/urls';
import { missingMetadata, pageMetadata, validateSeoCopy } from '../src/lib/seo/metadata';
import { buildArticleGraph, graphSchema, serializeJsonLd } from '../src/lib/seo/json-ld';

const runtime = readRuntimeConfig({ SEO_QA_MODE: 'true' });
describe('URL and metadata contract', () => {
  it('uses one trusted origin with deterministic query ordering', () => {
    expect(canonicalUrl(runtime.identity.url, '/kontroll/', { z: '2', a: '1', page: '2' })).toBe(`${runtime.identity.url}/kontroll?a=1&page=2&z=2`);
  });
  it.each(['//attacker.invalid', '/a/../b', '/x?y=z', '/x\\y'])('rejects an unsafe canonical path %s', path => expect(() => canonicalUrl(runtime.identity.url, path)).toThrow());
  it('normalizes slash and page=1 in one request transform', () => {
    const url = new URL('/kontroll/?page=1&z=2&a=1', runtime.identity.url);
    expect(normalizedRequestUrl(url)?.href).toBe(`${runtime.identity.url}/kontroll?a=1&z=2`);
    expect(normalizedRequestUrl(new URL('/kontroll', runtime.identity.url))).toBeNull();
  });
  it('rejects invalid article segments', () => expect(() => articlePath('bad/category', 'slug')).toThrow());
  it('keeps each fixture title and description unique and inside the required budgets', () => {
    const copies = [site.qa.home, site.qa.category, site.qa.article.seo];
    for (const copy of copies) validateSeoCopy(copy);
    expect(new Set(copies.map(copy => copy.title)).size).toBe(3);
    expect(new Set(copies.map(copy => copy.description)).size).toBe(3);
  });
  it('never derives the description from body content', () => {
    const metadata = pageMetadata(runtime, '/kontroll', site.qa.category);
    expect(metadata.description).toBe(site.qa.category.description);
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.languages).toEqual({ nb: `${runtime.identity.url}/kontroll`, 'x-default': `${runtime.identity.url}/kontroll` });
    expect(missingMetadata(runtime).alternates).toBeUndefined();
  });
});

describe('Typed and safe Article graph', () => {
  it('validates the actual expected graph and publication identity', () => {
    const graph = buildArticleGraph(runtime, site.qa.article);
    expect(graphSchema.safeParse(graph).success).toBe(true);
    const article = graph['@graph'].find(node => node['@type'] === 'Article');
    expect(article).toMatchObject({ headline: site.qa.article.title, datePublished: site.qa.article.publishedAt, dateModified: site.qa.article.modifiedAt });
  });
  it('rejects missing referenced nodes and reversed dates', () => {
    const graph = buildArticleGraph(runtime, site.qa.article);
    expect(graphSchema.safeParse({ ...graph, '@graph': graph['@graph'].filter(node => node['@type'] !== 'Person') }).success).toBe(false);
    expect(() => buildArticleGraph(runtime, { ...site.qa.article, modifiedAt: '2025-01-01T00:00:00.000Z' })).toThrow();
  });
  it('cannot break out of a script element', () => {
    const graph = buildArticleGraph(runtime, { ...site.qa.article, title: '</script><script>alert(1)</script>' });
    const serialized = serializeJsonLd(graph);
    expect(serialized.includes('<')).toBe(false); expect(JSON.parse(serialized)).toEqual(graph);
  });
});
