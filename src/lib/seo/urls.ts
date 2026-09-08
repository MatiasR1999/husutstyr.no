import { localizePath } from '../locale';
import { isPublicSlug } from '../slug';

export function canonicalUrl(siteUrl: string, path: string, params: Readonly<Record<string, string>> = {}): string {
  const origin = new URL(siteUrl);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') throw new Error('SITE_URL must be a clean HTTP(S) origin');
  if (!path.startsWith('/') || path.startsWith('//') || /[\\?#\u0000-\u0020]/.test(path)) throw new Error('Invalid canonical pathname');
  const normalized = localizePath(path === '/' ? path : path.replace(/\/+$/, ''));
  const url = new URL(normalized, origin);
  if (url.origin !== origin.origin || url.pathname !== normalized) throw new Error('Canonical path changed its origin or structure');
  for (const [key, value] of Object.entries(params).sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    if (key === 'page' && value === '1') continue;
    url.searchParams.append(key, value);
  }
  return url.href;
}

export function articlePath(category: string, slug: string): string {
  if (category === '_pages' && isPublicSlug(slug)) return localizePath(`/${slug}`);
  if (!isPublicSlug(category) || !isPublicSlug(slug)) throw new Error('Invalid article URL');
  return localizePath(`/${category}/${slug}`);
}

export function normalizedRequestUrl(input: URL): URL | null {
  const target = new URL(input);
  target.pathname = target.pathname === '/' ? '/' : target.pathname.replace(/\/+$/, '');
  if (target.searchParams.get('page') === '1') target.searchParams.delete('page');
  target.searchParams.sort();
  return target.href === input.href ? null : target;
}
