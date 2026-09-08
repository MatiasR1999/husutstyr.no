import site from '@site';
import type { Locale } from './locale';

export type CacheResource = 'article' | 'category' | 'home' | 'author' | 'topic' | 'rss' | 'sitemap' | 'og';
export function cacheTag(resource: CacheResource, id = '', locale: Locale = site.locale): string {
  const tag = [site.id, locale, resource, encodeURIComponent(id)].join(':');
  if (tag.length > 256) throw new Error('Cache tag exceeds 256 characters');
  return tag;
}
