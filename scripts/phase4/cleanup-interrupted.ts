import {neon} from '@neondatabase/serverless';
import {randomBytes,createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {setTimeout as delay} from 'node:timers/promises';
import assert from 'node:assert/strict';
import {qaConnection} from '../phase2/guard';
import {startQaServer} from '../qa-server';
import {normalizeSlug} from '../../src/lib/slug';
import site from '../../site.config';
const db=neon(qaConnection()),fixture=JSON.parse(await readFile('work/phase2-fixture.json','utf8')) as {identities:{editor:string}};
Object.assign(process.env,parseEnv(await readFile('.env.phase3.local','utf8')));
const hash=createHash('sha256').update(randomBytes(32)).digest('hex'),pattern=`${normalizeSlug(site.qa.markers.publicationTitle)}-%`;
await db`insert into editorial.sessions(token_hash,principal_id,expires_at) values(${hash},${fixture.identities.editor},now()+interval '5 minutes')`;
const server=await startQaServer('phase4-cleanup');
try {
 const rows=await db`select id,published_revision_id from editorial.articles where site_id=${site.id} and is_test=true and status='published' and slug like ${pattern}`;
 for(const row of rows) await db`select editorial.change_publication(${hash},${row.id},${row.published_revision_id},'withdraw',${randomUUID()})`;
 const jobs=await db`select j.event_id from editorial.publication_jobs j join editorial.publication_events e on e.id=j.event_id join editorial.articles a on a.id=e.article_id where a.site_id=${site.id} and a.is_test=true and a.slug like ${pattern} and e.event='withdraw' and j.cache_state='pending'`;
 for(const job of jobs) {
  await db`select editorial.retry_publication_job(${hash},${job.event_id})`;
  const response=await fetch(`${site.qa.identity.url}/api/publication-jobs`,{method:'POST',headers:{Authorization:`Bearer ${process.env.PUBLICATION_WORKER_SECRET}`,'Content-Type':'application/json'},body:JSON.stringify({eventId:job.event_id})});assert.equal(response.status,202);
  let state;for(let i=0;i<60;i++){[state]=await db`select cache_state,last_error from editorial.publication_jobs where event_id=${job.event_id}`;if(state?.cache_state==='confirmed')break;await delay(500);}assert.equal(state?.cache_state,'confirmed',JSON.stringify(state));
 }
 console.log(`PASS: withdrew ${rows.length} interrupted synthetic fixtures and confirmed ${jobs.length} pending withdrawal jobs.`);
} finally {await server.stop();await db`delete from editorial.sessions where token_hash=${hash}`;}
