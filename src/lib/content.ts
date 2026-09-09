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
// Listings never render the body, so they select a projection without it. Fetching every block for every article does not scale with the archive.
export type ArticleSummary=Pick<PublishedArticle,'id'|'slug'|'categorySlug'|'categoryName'|'pillarSlug'|'kind'|'title'|'summary'|'seo'|'author'|'revisionId'|'contentHash'|'publishedAt'|'modifiedAt'>&{readonly topicIds:readonly string[]};
const summaryRow=z.object({id:z.uuid(),namespace:z.string(),slug:z.string(),kind:z.enum(['article','news','review','page']),revision_id:z.uuid(),content_hash:z.string(),category_name:z.string(),pillar_slug:z.string(),author_snapshot:authorSnapshotSchema,title:z.string(),summary:z.string(),seo:z.object({title:z.string(),description:z.string()}),topic_ids:z.array(z.uuid()),published_at:z.coerce.date(),modified_at:z.coerce.date()});
function summaryFromRow(value:unknown):ArticleSummary {
  const row=summaryRow.parse(value);
  return {id:row.id,slug:row.slug,categorySlug:row.namespace,categoryName:row.category_name,pillarSlug:row.pillar_slug,kind:row.kind,title:row.title,summary:row.summary,seo:row.seo,author:row.author_snapshot,revisionId:row.revision_id,contentHash:row.content_hash,topicIds:row.topic_ids,publishedAt:row.published_at.toISOString(),modifiedAt:row.modified_at.toISOString()};
}
const summaryColumns=sql`id,namespace,slug,kind,revision_id,content_hash,category_name,pillar_slug,author_snapshot,payload->>'title' as title,payload->>'summary' as summary,payload->'seo' as seo,coalesce(payload->'topicIds','[]'::jsonb) as topic_ids,published_at,modified_at`;
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
export const getArticles=cache(async(category:string):Promise<readonly ArticleSummary[]>=>unstable_cache(async()=>{
  const rows=await publicDatabase().execute(sql`select ${summaryColumns} from editorial.published_articles where site_id=${site.id} and locale=${site.locale} and is_test=${readRuntimeConfig(process.env).qa} and kind<>'page' and (pillar_slug=${category} or namespace=${category}) order by published_at desc,id`);
  return rows.rows.map(summaryFromRow);
},[...contentScope(),'category',category],{revalidate:600,tags:[cacheTag('category',category),cacheTag('rss',category),cacheTag('home')]})());
const categorySchema=z.object({id:z.uuid(),slug:z.string(),name:z.string(),introduction:z.string(),seo:z.object({title:z.string(),description:z.string()})});
const chromeSchema=z.object({categories:z.array(categorySchema),topics:z.array(z.object({id:z.uuid(),slug:z.string(),name:z.string()})),trustPages:z.array(z.object({slug:z.string(),title:z.string()}))});
// Categories, topics and trust pages always revalidate together, so one round trip serves every render instead of three.
const siteChrome=cache(async()=>unstable_cache(async()=>{
 const qa=readRuntimeConfig(process.env).qa;
 const rows=await publicDatabase().execute(sql`select
  (select coalesce(json_agg(c order by c.slug),'[]'::json) from editorial.published_categories c where c.site_id=${site.id} and c.locale=${site.locale} and exists(select 1 from editorial.published_articles a where a.pillar_slug=c.slug and a.kind<>'page' and a.site_id=c.site_id and a.locale=c.locale and a.is_test=${qa})) as categories,
  (select coalesce(json_agg(json_build_object('id',t.id,'slug',t.slug,'name',t.name) order by t.slug),'[]'::json) from editorial.public_topics t where t.site_id=${site.id} and t.locale=${site.locale} and t.is_test=${qa}) as topics,
  (select coalesce(json_agg(json_build_object('slug',p.slug,'title',p.payload->>'title') order by p.slug),'[]'::json) from editorial.published_articles p where p.site_id=${site.id} and p.locale=${site.locale} and p.is_test=${qa} and p.kind='page') as "trustPages"`);
 return chromeSchema.parse(rows.rows[0]);
},[...contentScope(),'chrome'],{revalidate:3600,tags:[cacheTag('category'),cacheTag('home'),cacheTag('sitemap')]})());
export const getCategories=cache(async()=>(await siteChrome()).categories);
export const getCategory=cache(async(slug:string)=>{const category=(await getCategories()).find(category=>category.slug===slug);if(category)return category;if(slug==='anmeldelser'){const seo=await getPageCopy('/anmeldelser',1);if(seo)return {id:slug,slug,name:site.labels.reviews,introduction:'',seo};}return null;});

export const getAllArticles=cache(async():Promise<readonly ArticleSummary[]>=>unstable_cache(async()=>{
 const rows=await publicDatabase().execute(sql`select ${summaryColumns} from editorial.published_articles where site_id=${site.id} and locale=${site.locale} and is_test=${readRuntimeConfig(process.env).qa} and kind<>'page' order by published_at desc,id`);
 return rows.rows.map(summaryFromRow);
},[...contentScope(),'all-articles'],{revalidate:600,tags:[cacheTag('home'),cacheTag('sitemap')]})());
export const getTopics=cache(async()=>(await siteChrome()).topics);
export const getPageCopy=cache(async(path:string,page:number)=>unstable_cache(async()=>{
 const rows=await publicDatabase().execute(sql`select seo from editorial.public_page_metadata where site_id=${site.id} and locale=${site.locale} and is_test=${readRuntimeConfig(process.env).qa} and path=${path} and page=${page}`);
 return rows.rows[0]?z.object({seo:z.object({title:z.string(),description:z.string()})}).parse(rows.rows[0]).seo:null;
},[...contentScope(),'page-copy',path,String(page)],{revalidate:600,tags:[cacheTag('home'),cacheTag('sitemap')]})());

export const getTrustPages=cache(async()=>(await siteChrome()).trustPages);
