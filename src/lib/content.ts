import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import {articlePath} from './seo/urls';
import {cacheTag} from './cache-tags';
import {publicDatabase,contentScope} from './public-data';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import site from '@site';
import { readRuntimeConfig } from './config';
import { contentSchema, authorSnapshotSchema, reviewSnapshotSchema } from './domain/content';
import type { QaArticle } from './site-types';
import type { ContentBlock } from './domain/content';

export type PublishedArticle=QaArticle & {readonly author:z.infer<typeof authorSnapshotSchema>;readonly revisionId:string;readonly contentHash:string;readonly blocks:readonly ContentBlock[];readonly categoryName:string;readonly kind:'article'|'news'|'review'|'page';readonly pillarSlug:string;readonly payload:import('./domain/content').ArticleContent;readonly reviewSnapshot:import('./domain/content').ReviewSnapshot|null};
const publicRow=z.object({id:z.uuid(),namespace:z.string(),slug:z.string(),revision_id:z.uuid(),content_hash:z.string(),category_name:z.string(),pillar_slug:z.string(),review_snapshot:reviewSnapshotSchema.nullable(),payload:contentSchema,author_snapshot:authorSnapshotSchema,published_at:z.coerce.date(),modified_at:z.coerce.date()});
function articleFromRow(value:unknown):PublishedArticle {
  const row=publicRow.parse(value),content=row.payload;
  return {id:row.id,revisionId:row.revision_id,contentHash:row.content_hash,slug:row.slug,categorySlug:row.namespace,categoryName:row.category_name,pillarSlug:row.pillar_slug,payload:content,reviewSnapshot:row.review_snapshot,kind:content.kind,title:content.title,summary:content.summary,section:content.section,blocks:content.blocks,body:content.blocks.flatMap(block=>block.type==='paragraph'?[block.text]:[]),seo:content.seo,author:row.author_snapshot,publishedAt:row.published_at.toISOString(),modifiedAt:row.modified_at.toISOString()};
}
// Request memoization keeps metadata, body and JSON-LD on the same published revision.
export const getArticle=cache(async(category:string,slug:string):Promise<PublishedArticle|null>=>{
  let path:string;try{path=articlePath(category,slug);}catch{return null;}
  return unstable_cache(async()=>{
  const rows=await publicDatabase().execute(sql`select * from editorial.published_articles where site_id=${site.id} and locale=${site.locale} and is_test=${readRuntimeConfig(process.env).qa} and namespace=${category} and slug=${slug} limit 1`);
  return rows.rows[0]?articleFromRow(rows.rows[0]):null;
},[...contentScope(),'article',category,slug],{revalidate:3600,tags:[cacheTag('article',path),cacheTag('og',path)]})();});
export const getArticles=cache(async(category:string):Promise<readonly PublishedArticle[]>=>unstable_cache(async()=>{
  const rows=await publicDatabase().execute(sql`select * from editorial.published_articles where site_id=${site.id} and locale=${site.locale} and is_test=${readRuntimeConfig(process.env).qa} and kind<>'page' and (pillar_slug=${category} or namespace=${category}) order by published_at desc,id`);
  return rows.rows.map(articleFromRow);
},[...contentScope(),'category',category],{revalidate:600,tags:[cacheTag('category',category),cacheTag('rss',category),cacheTag('home')]})());
const categorySchema=z.object({id:z.uuid(),slug:z.string(),name:z.string(),introduction:z.string(),seo:z.object({title:z.string(),description:z.string()})});
export const getCategories=cache(async()=>unstable_cache(async()=>{
  const rows=await publicDatabase().execute(sql`select c.* from editorial.published_categories c where c.site_id=${site.id} and c.locale=${site.locale} and exists(select 1 from editorial.published_articles a where a.pillar_slug=c.slug and a.kind<>'page' and a.site_id=c.site_id and a.locale=c.locale and a.is_test=${readRuntimeConfig(process.env).qa}) order by c.slug`);
  return z.array(categorySchema).parse(rows.rows);
},[...contentScope(),'categories'],{revalidate:3600,tags:[cacheTag('category'),cacheTag('home'),cacheTag('sitemap')]})());
export const getCategory=cache(async(slug:string)=>{const category=(await getCategories()).find(category=>category.slug===slug);if(category)return category;if(slug==='anmeldelser'){const seo=await getPageCopy('/anmeldelser',1);if(seo)return {id:slug,slug,name:site.labels.reviews,introduction:'',seo};}return null;});

export const getAllArticles=cache(async():Promise<readonly PublishedArticle[]>=>unstable_cache(async()=>{
 const rows=await publicDatabase().execute(sql`select * from editorial.published_articles where site_id=${site.id} and locale=${site.locale} and is_test=${readRuntimeConfig(process.env).qa} and kind<>'page' order by published_at desc,id`);
 return rows.rows.map(articleFromRow);
},[...contentScope(),'all-articles'],{revalidate:600,tags:[cacheTag('home'),cacheTag('sitemap')]})());
export const getTopics=cache(async()=>unstable_cache(async()=>{
 const rows=await publicDatabase().execute(sql`select * from editorial.public_topics where site_id=${site.id} and locale=${site.locale} and is_test=${readRuntimeConfig(process.env).qa} order by slug`);
 return z.array(z.object({id:z.uuid(),slug:z.string(),name:z.string()})).parse(rows.rows);
},[...contentScope(),'topics'],{revalidate:3600,tags:[cacheTag('home'),cacheTag('sitemap')]})());
export const getPageCopy=cache(async(path:string,page:number)=>unstable_cache(async()=>{
 const rows=await publicDatabase().execute(sql`select seo from editorial.public_page_metadata where site_id=${site.id} and locale=${site.locale} and is_test=${readRuntimeConfig(process.env).qa} and path=${path} and page=${page}`);
 return rows.rows[0]?z.object({seo:z.object({title:z.string(),description:z.string()})}).parse(rows.rows[0]).seo:null;
},[...contentScope(),'page-copy',path,String(page)],{revalidate:600,tags:[cacheTag('home'),cacheTag('sitemap')]})());

export const getTrustPages=cache(async()=>unstable_cache(async()=>{
 const rows=await publicDatabase().execute(sql`select slug,payload->>'title' as title from editorial.published_articles where site_id=${site.id} and locale=${site.locale} and is_test=${readRuntimeConfig(process.env).qa} and kind='page' order by slug`);
 return z.array(z.object({slug:z.string(),title:z.string()})).parse(rows.rows);
},[...contentScope(),'trust-pages'],{revalidate:3600,tags:[cacheTag('home'),cacheTag('sitemap')]})());
