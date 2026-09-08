import type { Metadata } from 'next';
import site from '@site';
import type { RuntimeConfig } from '../config';
import type { SeoCopy } from '../site-types';
import { canonicalUrl } from './urls';
import { encodeView } from './listing';
import { robotsPolicy } from './robots';

export function validateSeoCopy(copy: SeoCopy): void {
  if ([...copy.title].length < 50 || [...copy.title].length > 60) throw new Error('SEO title must contain 50-60 characters');
  if ([...copy.description].length < 140 || [...copy.description].length > 160) throw new Error('SEO description must contain 140-160 characters');
}

export function pageMetadata(config: RuntimeConfig, path: string, copy: SeoCopy,options:{params?:Readonly<Record<string,string>>;facet?:boolean;belowThreshold?:boolean;kind?:keyof typeof site.seoTemplates;displayTitle?:string}={}): Metadata {
  copy={...copy,title:site.seoTemplates[options.kind??'article'].replace('{title}',copy.title)};
  validateSeoCopy(copy);
  const canonical = canonicalUrl(config.identity.url, path,options.params);
  const image={url:canonicalUrl(config.identity.url,`/og/${encodeView(path,options.params)}`),width:site.og.width,height:site.og.height,alt:options.displayTitle??copy.title};
  return {
    title: { absolute: copy.title }, description: copy.description,
    alternates: { canonical, languages: { [site.locale]: canonical, 'x-default': canonical } },
    robots: robotsPolicy(config,options),
    openGraph: { type: options.kind==='article'||options.kind==='news'||options.kind==='review'?'article':'website', locale: 'nb_NO', siteName: config.identity.name, url: canonical, title: options.displayTitle??copy.title, description: copy.description, images:[image] },
    twitter: { card: 'summary_large_image', title: options.displayTitle??copy.title, description: copy.description, images:[image] },
  };
}

export function missingMetadata(config: RuntimeConfig): Metadata {
  return { title: { absolute: site.ui.notFound }, robots: robotsPolicy(config, { missing: true }) };
}
