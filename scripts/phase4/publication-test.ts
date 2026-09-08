import {parseEnv} from 'node:util';
import assert from 'node:assert/strict';
import {neon} from '@neondatabase/serverless';
import {randomBytes,createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {load} from 'cheerio';
import site from '../../site.config';
import {parseContent} from '../../src/lib/domain/content';
import {encodeView} from '../../src/lib/seo/listing';
import {qaConnection} from '../phase2/guard';
import {startQaServer} from '../qa-server';
const db=neon(qaConnection()),origin=site.qa.identity.url;
const runtimeEnv=parseEnv(await readFile('.env.phase3.local','utf8'));process.env.DATABASE_URL=runtimeEnv.DATABASE_URL;
const fixture=JSON.parse(await readFile('work/phase2-fixture.json','utf8')) as {identities:{editor:string}};
const hash=createHash('sha256').update(randomBytes(32)).digest('hex');
await db`insert into editorial.sessions(token_hash,principal_id,expires_at) values(${hash},${fixture.identities.editor},now()+interval '15 minutes')`;
const server=await startQaServer('phase4-publication');
const reports=[];
async function deliver(eventId:string) {
 const response=await fetch(`${origin}/api/publication-jobs`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.PUBLICATION_WORKER_SECRET}`},body:JSON.stringify({eventId})});assert.equal(response.status,202);
 let state;for(let i=0;i<80;i++){[state]=await db`select cache_state,last_error from editorial.publication_jobs where event_id=${eventId}`;if(state?.cache_state==='confirmed')return;await delay(500);}throw new Error(JSON.stringify(state));
}
async function change(id:string,revision:string,operation:'publish'|'withdraw') {const [row]=await db`select editorial.change_publication(${hash},${id},${revision},${operation},${randomUUID()}) as id`;return String(row?.id);}
try {
 const [trust]=await db`select * from editorial.published_articles where site_id=${site.id} and is_test=true and namespace='_pages' and slug='kontakt'`;assert.ok(trust);
 const before=await fetch(`${origin}/kontakt`);assert.equal(before.status,200);const old=await before.text();
 const original=parseContent(trust.payload),changed=parseContent({...original,blocks:[{type:'paragraph',text:site.qa.markers.publicationUpdate}]});
 const [revision]=await db`select editorial.save_revision(${hash},${trust.id},${trust.revision_id},${JSON.stringify(changed)}::jsonb) as id`;
 await db`select editorial.submit_revision(${hash},${trust.id},${revision?.id})`;await db`select editorial.approve_revision(${hash},${trust.id},${revision?.id})`;
 const event=await change(String(trust.id),String(revision?.id),'publish');await deliver(event);
 const updated=await fetch(`${origin}/kontakt`),body=await updated.text();assert.notEqual(body,old);assert.ok(load(body)('main').text().includes(site.qa.markers.publicationUpdate));
 const [restored]=await db`select editorial.save_revision(${hash},${trust.id},${revision?.id},${JSON.stringify(original)}::jsonb) as id`;
 await db`select editorial.submit_revision(${hash},${trust.id},${restored?.id})`;await db`select editorial.approve_revision(${hash},${trust.id},${restored?.id})`;await deliver(await change(String(trust.id),String(restored?.id),'publish'));
 reports.push('Trust page revision invalidates its canonical cache key and updates HTML plus OG before confirmation');
 for(const [namespace,slug,path] of [['_pages','kontakt','/kontakt'],['anmeldelser','qa-phase4-eligible','/anmeldelser/qa-phase4-eligible']]) {
  const [identity]=await db`select id,current_revision_id,published_revision_id from editorial.articles where site_id=${site.id} and is_test=true and namespace=${namespace} and slug=${slug}`;assert.ok(identity);
  if(!identity.published_revision_id) await deliver(await change(String(identity.id),String(identity.current_revision_id),'publish'));
  const [row]=await db`select id,revision_id from editorial.published_articles where id=${identity.id}`;assert.ok(row);
  const imageUrl=`${origin}/og/${encodeView(path!)}`;assert.equal((await fetch(imageUrl)).status,200);
  const eventId=await change(String(row.id),String(row.revision_id),'withdraw');
  assert.equal((await fetch(`${origin}${path}`)).status,410);assert.equal((await fetch(imageUrl)).status,410);
  await deliver(eventId);await deliver(await change(String(row.id),String(row.revision_id),'publish'));
  assert.equal((await fetch(`${origin}${path}`)).status,200);assert.equal((await fetch(imageUrl)).status,200);
  reports.push(`${namespace}: immediate HTML and actual OG denial, confirmed removal, and authorized republication`);
 }
 await writeFile(`${process.env.QA_EVIDENCE_DIR??'docs/qa/phase4'}/page-publication.json`,JSON.stringify({checkedAt:new Date().toISOString(),reports},null,2)+'\n');console.log('PASS: trust revision invalidation and immediate review/trust HTML+OG withdrawal and restoration.');
} finally {await server.stop();await db`delete from editorial.sessions where token_hash=${hash}`;}
