import {createHash} from 'node:crypto';
import site from '@site';
import type {RuntimeConfig} from '@/lib/config';
import type {PublishedArticle} from '@/lib/content';
import {canonicalUrl,articlePath} from './urls';
export const xmlHeaders={'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'};
export const xmlEscape=(value:string)=>value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]!));
const declaration='<?xml version="1.0" encoding="UTF-8"?>';
const namespace='http://www.sitemaps.org/schemas/sitemap/0.9';
export interface SitemapEntry {path:string;lastmod:string}
export function sitemapBundle(runtime:RuntimeConfig,entries:readonly SitemapEntry[],limits:{urls:number;bytes:number}={urls:site.delivery.sitemapMaxUrls,bytes:site.delivery.sitemapMaxBytes}) {
 if(limits.urls<1||limits.urls>45000||limits.bytes>52428800) throw new Error('Invalid sitemap budget');
 const rows=runtime.qa||runtime.preview?[]:[...entries].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 if(new Set(rows.map(row=>row.path)).size!==rows.length) throw new Error('Duplicate sitemap path');
 const prefix=`${declaration}<urlset xmlns="${namespace}">`,suffix='</urlset>';
 const overhead=Buffer.byteLength(prefix+suffix);
 if(limits.bytes<=overhead) throw new Error('Sitemap budget too small');
 const segments:string[]=[];let elements:string[]=[],bytes=overhead;
 for(const row of rows) {
  const date=new Date(row.lastmod).toISOString(),url=canonicalUrl(runtime.identity.url,row.path.split('?')[0]!,Object.fromEntries(new URLSearchParams(row.path.split('?')[1])));
  if(url.length>=2048) throw new Error('Sitemap URL too long');
  const xml=`<url><loc>${xmlEscape(url)}</loc><lastmod>${date}</lastmod></url>`,size=Buffer.byteLength(xml);
  if(size+overhead>limits.bytes) throw new Error('Sitemap entry exceeds byte budget');
  if(elements.length===limits.urls||bytes+size>limits.bytes){segments.push(prefix+elements.join('')+suffix);elements=[];bytes=overhead;}
  elements.push(xml);bytes+=size;
 }
 if(elements.length) segments.push(prefix+elements.join('')+suffix);
 const version=createHash('sha256').update(segments.join('')).digest('hex');
 const index=`${declaration}<sitemapindex xmlns="${namespace}">${segments.map((_,i)=>`<sitemap><loc>${xmlEscape(canonicalUrl(runtime.identity.url,'/sitemap.xml',{segment:`${version}.${i}`}))}</loc></sitemap>`).join('')}</sitemapindex>`;
 if(segments.length>50000||Buffer.byteLength(index)>52428800) throw new Error('Sitemap index exceeds protocol limit');
 return {version,index,segments,count:rows.length};
}
export function rssFeed(runtime:RuntimeConfig,category:{slug:string;name:string;introduction:string},articles:readonly Pick<PublishedArticle,'id'|'title'|'categorySlug'|'slug'|'publishedAt'|'summary'|'revisionId'>[]) {
 const items=articles.map(article=>`<item><title>${xmlEscape(article.title)}</title><link>${xmlEscape(canonicalUrl(runtime.identity.url,articlePath(article.categorySlug,article.slug)))}</link><guid isPermaLink="false">${xmlEscape(`${site.id}:${site.locale}:${article.id}`)}</guid><pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate><description>${xmlEscape(article.summary)}</description></item>`).join('');
 return `${declaration}<rss version="2.0"><channel><title>${xmlEscape(category.name)}</title><link>${xmlEscape(canonicalUrl(runtime.identity.url,`/${category.slug}`))}</link><description>${xmlEscape(category.introduction)}</description><language>${site.locale}</language>${items}</channel></rss>`;
}
export function robotsText(runtime:RuntimeConfig) {
 const paths=runtime.qa||runtime.preview?['/']:site.delivery.robotsDisallow;
 return ['User-agent: *',...paths.map(path=>`Disallow: ${path}`),`Sitemap: ${canonicalUrl(runtime.identity.url,'/sitemap.xml')}`,''].join('\n');
}
