import 'server-only';
import {sql} from 'drizzle-orm';
import {z} from 'zod';
import {networkArticlePattern} from '@/lib/seo/network-cache';
import {revalidatePath,revalidateTag} from 'next/cache';
import site from '@site';
import {readRuntimeConfig} from '@/lib/config';
import {cacheTag} from '@/lib/cache-tags';
import {editorDb} from './repository';
export const publicationSnapshot=z.object({articleId:z.uuid(),siteId:z.string(),locale:z.literal('nb'),isTest:z.boolean(),path:z.string(),namespace:z.string(),revisionId:z.uuid(),contentHash:z.string().regex(/^[a-f0-9]{64}$/),authors:z.array(z.string()),topics:z.array(z.uuid()),operation:z.enum(['publish','withdraw']),changed:z.boolean()});
export const jobSchema=z.object({event_id:z.uuid(),snapshot:publicationSnapshot,cache_state:z.enum(['pending','confirmed','superseded']),notification_state:z.enum(['pending','sent','skipped','rejected']),attempts:z.number(),lease_token:z.uuid().nullable().optional(),last_error:z.string().nullable()});
export type PublicationJob=z.infer<typeof jobSchema>;
async function data(query:ReturnType<typeof sql>) {const result=await editorDb().execute<{data:unknown}>(query);return result.rows[0]?.data;}
export async function changePublication(hash:string,input:{articleId:string;revisionId:string;operation:'publish'|'withdraw';requestId:string}) {
 return z.uuid().parse(await data(sql`select editorial.change_publication(${hash},${z.uuid().parse(input.articleId)},${z.uuid().parse(input.revisionId)},${input.operation},${z.uuid().parse(input.requestId)}) as data`));
}
export async function publicationStatus(hash:string,id:string) {return jobSchema.parse(await data(sql`select editorial.publication_status(${hash},${z.uuid().parse(id)}) as data`));}
export async function claimJob(id:string) {const value=await data(sql`select editorial.claim_publication_job(${z.uuid().parse(id)},${site.id},${readRuntimeConfig(process.env).qa}) as data`);return value?jobSchema.parse(value):null;}
export async function dueJobs() {const rows=await editorDb().execute<{id:string}>(sql`select editorial.due_publication_jobs(${site.id},${readRuntimeConfig(process.env).qa}) as id`);return rows.rows.map(row=>z.uuid().parse(row.id));}
export async function finishJob(job:PublicationJob,cache:'pending'|'confirmed',notification:PublicationJob['notification_state'],error:string|null,delay:number) {return z.boolean().parse(await data(sql`select editorial.finish_publication_job(${job.event_id},${job.lease_token},${cache},${notification},${error},${delay}) as data`));}
export function invalidatePublication(snapshot:PublicationJob['snapshot']) {
 if(snapshot.siteId!==site.id||snapshot.locale!==site.locale||snapshot.isTest!==readRuntimeConfig(process.env).qa) throw new Error('Publication scope mismatch');
 const tags=[cacheTag('article',snapshot.path),cacheTag('og',snapshot.path),cacheTag('category',snapshot.namespace),cacheTag('category'),cacheTag('home'),cacheTag('rss',snapshot.namespace),cacheTag('sitemap'),...snapshot.authors.map(author=>cacheTag('author',author)),...snapshot.topics.map(topic=>cacheTag('topic',topic))];
 for(const tag of tags) revalidateTag(tag,{expire:0});
 revalidatePath(networkArticlePattern,'page');
 for(const path of [snapshot.path,`/${snapshot.namespace}`,'/',`/${snapshot.namespace}/rss.xml`,'/sitemap.xml',`${snapshot.path}/opengraph-image`]) revalidatePath(path);
}

export async function retryPublication(hash:string,id:string) {await editorDb().execute(sql`select editorial.retry_publication_job(${hash},${z.uuid().parse(id)})`);}
