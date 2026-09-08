import assert from 'node:assert/strict';
import {neon} from '@neondatabase/serverless';
import {createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {z} from 'zod';
import site from '../../site.config';
import {parseContent} from '../../src/lib/domain/content';
import {qaConnection} from '../phase2/guard';
import {startQaServer} from '../qa-server';
const db=neon(qaConnection()),origin=site.qa.identity.url;
const fixture=JSON.parse(await readFile('work/phase2-fixture.json','utf8')) as {authorId:string;categoryId:string;identities:{editor:string;writer:string}};
const token=randomUUID(),hash=createHash('sha256').update(token).digest('hex'),writerToken=randomUUID(),writerHash=createHash('sha256').update(writerToken).digest('hex');
await db`insert into editorial.sessions(token_hash,principal_id,expires_at) values(${hash},${fixture.identities.editor},now()+interval '30 minutes'),(${writerHash},${fixture.identities.writer},now()+interval '30 minutes')`;
const server=await startQaServer('phase5-metrics'),url=new URL('/api/editor/metrics?from=2000-01-01T00%3A00%3A00.000Z&to=2100-01-01T00%3A00%3A00.000Z',origin);
const totals=z.object({firstPublishedInPeriod:z.number().int(),publicationEventsInPeriod:z.number().int(),currentlyPublished:z.number().int(),withOriginalResearch:z.number().int(),originalResearchShare:z.number().nullable(),asOf:z.string(),from:z.string(),to:z.string(),basis:z.object({periodBounds:z.literal('from-inclusive-to-exclusive')})});
async function report(){const response=await fetch(url,{headers:{Cookie:`editor_session=${token}`}});assert.equal(response.status,200);assert.match(response.headers.get('cache-control')??'',/no-store/);assert.match(response.headers.get('x-robots-tag')??'',/noindex/);return totals.parse(await response.json());}
let articleId:string|undefined;const evidence:Record<string,unknown>={checkedAt:new Date().toISOString()};
async function publication(revision:string,operation:'publish'|'withdraw') {const [row]=await db`select editorial.change_publication(${hash},${articleId!},${revision},${operation},${randomUUID()}) as id`;return z.uuid().parse(row?.id);}
async function approve(revision:string){await db`select editorial.submit_revision(${hash},${articleId!},${revision})`;await db`select editorial.approve_revision(${hash},${articleId!},${revision})`;}
try {
 assert.equal((await fetch(url)).status,401);assert.equal((await fetch(url,{headers:{Cookie:'editor_session=forged'}})).status,403);assert.equal((await fetch(url,{headers:{Cookie:`editor_session=${writerToken}`}})).status,403);
 assert.equal((await fetch(new URL('/api/editor/metrics?from=invalid&to=invalid',origin),{headers:{Cookie:`editor_session=${token}`}})).status,400);
 const baseline=await report();evidence.baseline=baseline;
 const [expected]=await db`select count(*)::int as total from editorial.published_articles where site_id=${site.id} and locale=${site.locale} and is_test=true and kind<>'page'`;assert.equal(baseline.currentlyPublished,expected?.total);
 const payload=parseContent({version:1,kind:'article',title:site.qa.phase5.title,summary:site.qa.article.summary,section:site.qa.article.section,blocks:site.qa.article.body.map(text=>({type:'paragraph',text})),sources:[],topicIds:[],seo:{title:site.qa.phase4.seoTitle.replace('{id}','099'),description:site.qa.phase4.description.replace('{id}','099')},research:[{method:site.qa.markers.research,responsibleAuthorId:fixture.authorId,performedAt:new Date().toISOString(),evidence:[{url:site.qa.markers.source,description:site.qa.markers.evidence}]}]});
 const [made]=await db`select editorial.create_article(${hash},${fixture.categoryId},${`qa-phase5-metrics-${randomUUID().slice(0,8)}`},${JSON.stringify(payload)}::jsonb,true) as id`;articleId=z.uuid().parse(made?.id);
 const [article]=await db`select current_revision_id from editorial.articles where id=${articleId}`;let revision=z.uuid().parse(article?.current_revision_id);await approve(revision);await publication(revision,'publish');
 const first=await report();assert.equal(first.firstPublishedInPeriod,baseline.firstPublishedInPeriod+1);assert.equal(first.currentlyPublished,baseline.currentlyPublished+1);assert.equal(first.withOriginalResearch,baseline.withOriginalResearch+1);assert.ok(Math.abs(first.originalResearchShare!-first.withOriginalResearch/first.currentlyPublished)<1e-12);evidence.first=first;
 const [next]=await db`select editorial.save_revision(${hash},${articleId},${revision},${JSON.stringify({...payload,research:[]})}::jsonb) as id`;revision=z.uuid().parse(next?.id);
 assert.equal((await report()).withOriginalResearch,first.withOriginalResearch);await approve(revision);await publication(revision,'publish');
 const revised=await report();assert.equal(revised.firstPublishedInPeriod,first.firstPublishedInPeriod);assert.equal(revised.publicationEventsInPeriod,first.publicationEventsInPeriod+1);assert.equal(revised.currentlyPublished,first.currentlyPublished);assert.equal(revised.withOriginalResearch,baseline.withOriginalResearch);evidence.revised=revised;
 await publication(revision,'withdraw');const withdrawn=await report();assert.equal(withdrawn.firstPublishedInPeriod,first.firstPublishedInPeriod);assert.equal(withdrawn.currentlyPublished,baseline.currentlyPublished);assert.equal(withdrawn.withOriginalResearch,baseline.withOriginalResearch);evidence.withdrawn=withdrawn;
 const emptySite=`qa-empty-${randomUUID()}`,emptyPrincipal=randomUUID(),emptyHash=createHash('sha256').update(randomUUID()).digest('hex');
 try {
  await db`insert into editorial.sites(id,reserved_routes) values(${emptySite},ARRAY[]::text[])`;await db`insert into editorial.locales(site_id,locale) values(${emptySite},${site.locale})`;
  await db`insert into editorial.principals(id,site_id,issuer,subject,role,is_test) values(${emptyPrincipal},${emptySite},${site.qa.oidc.issuer},${randomUUID()},'editor',true)`;await db`insert into editorial.sessions(token_hash,principal_id,expires_at) values(${emptyHash},${emptyPrincipal},now()+interval '5 minutes')`;
  const [empty]=await db`select editorial.publication_metrics(${emptyHash},${site.locale},'2000-01-01'::timestamptz,'2100-01-01'::timestamptz) as result`;const value=empty?.result;assert.equal(value.currentlyPublished,0);assert.equal(value.withOriginalResearch,0);assert.equal(value.originalResearchShare,null);evidence.empty=value;
 }finally{await db`delete from editorial.sessions where token_hash=${emptyHash}`;await db`delete from editorial.principals where id=${emptyPrincipal}`;await db`delete from editorial.locales where site_id=${emptySite}`;await db`delete from editorial.sites where id=${emptySite}`;}
 evidence.passed=['Unauthorized, forged and writer requests denied','Explicit period and protected no-store HTTP report matches database','Only first publication increases first-published volume','A draft preserves the published research result','A published revision updates the research fraction without creating a new article','Withdrawal changes inventory without erasing historical first publication','Empty publication inventory has a null research fraction'];
 await writeFile(`${process.env.QA_EVIDENCE_DIR??'docs/qa/phase5'}/metrics.json`,JSON.stringify(evidence,null,2)+'\n');console.log('PASS: seven real database/HTTP publication-metric scenarios.');
}finally {
 if(articleId){const [article]=await db`select published_revision_id from editorial.articles where id=${articleId}`;if(article?.published_revision_id)await publication(z.uuid().parse(article.published_revision_id),'withdraw');const [job]=await db`select id from editorial.publication_events where article_id=${articleId} and event='withdraw' order by created_at desc limit 1`;if(job)await fetch(new URL('/api/publication-jobs',origin),{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.PUBLICATION_WORKER_SECRET}`},body:JSON.stringify({eventId:job.id})});}
 await server.stop();await db`delete from editorial.sessions where token_hash in (${hash},${writerHash})`;
}
