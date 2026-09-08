import 'server-only';
import {sql} from 'drizzle-orm';
import {z} from 'zod';
import site from '@site';
import {createDatabase} from './db/client';
import {readRuntimeConfig} from './config';
export function publicDatabase() {const value=process.env.DATABASE_URL;if(!value||new URL(value).username!=='seo_public_reader') throw new Error('Restricted public database required');return createDatabase(value);}
export function contentScope() {const url=new URL(process.env.DATABASE_URL!);return [site.id,site.locale,String(readRuntimeConfig(process.env).qa),url.hostname,url.pathname];}
const disposition=z.object({status:z.union([z.literal(200),z.literal(301),z.literal(410)]),destination:z.string().nullable()});
async function rawDisposition(path:string) {
 const rows=await publicDatabase().execute(sql`select status,destination from editorial.public_routes where site_id=${site.id} and is_test=${readRuntimeConfig(process.env).qa} and path=${path}`);
 if(rows.rows.length>1) throw new Error('Conflicting public URL states');
 return rows.rows[0]?disposition.parse(rows.rows[0]):null;
}
export async function sitemapEntries() {
 const rows=await publicDatabase().execute(sql`with live as (select * from editorial.published_articles where site_id=${site.id} and locale=${site.locale} and is_test=${readRuntimeConfig(process.env).qa}),
 groups as (
  select '/'||pillar_slug as path,count(*)::int as total,max(modified_at) as lastmod from live where kind<>'page' group by pillar_slug
  union all select '/anmeldelser',count(*)::int,max(modified_at) from live where kind='review' having count(*)>0
  union all select '/forfatter/'||(author_snapshot->>'slug'),count(*)::int,max(modified_at) from live where kind<>'page' group by author_snapshot->>'slug'
  union all select '/emne/'||t.slug,count(*)::int,max(a.modified_at) from editorial.public_topics t join live a on a.payload->'topicIds' ? t.id::text where t.site_id=${site.id} and t.locale=${site.locale} and t.is_test=${readRuntimeConfig(process.env).qa} group by t.slug having count(*)>=${site.minTopicArticles}
 ), listings as (select g.path,g.lastmod,g.total,n from groups g cross join lateral generate_series(1,(g.total+${site.pageSize}-1)/${site.pageSize}) n)
 select editorial.article_path(namespace,slug) as path,modified_at as lastmod from live
 union all select l.path||case when l.n=1 then '' else '?page='||l.n::text end,greatest(l.lastmod,m.created_at) from listings l left join editorial.public_page_metadata m on m.site_id=${site.id} and m.locale=${site.locale} and m.is_test=${readRuntimeConfig(process.env).qa} and m.path=l.path and m.page=l.n where m.id is not null or (l.n=1 and exists(select 1 from editorial.published_categories c where '/'||c.slug=l.path and c.site_id=${site.id} and c.locale=${site.locale}))
 union all select '/',max(modified_at) from live having count(*)>0`);
 return z.array(z.object({path:z.string(),lastmod:z.coerce.date().transform(value=>value.toISOString())})).parse(rows.rows);
}

export async function routeDisposition(path:string) {
 const first=await rawDisposition(path);if(first?.status!==301) return first;
 const seen=new Set([path]);let target=first.destination;
 while(target) {
  if(seen.has(target)||seen.size>50) throw new Error('Invalid redirect cycle');seen.add(target);
  const next=await rawDisposition(target);
  if(!next) throw new Error('Redirect target is not published');
  if(next.status===410) return {status:410 as const,destination:null};
  if(next.status===200) return {status:301 as const,destination:target};
  target=next.destination;
 }
 throw new Error('Invalid redirect destination');
}
