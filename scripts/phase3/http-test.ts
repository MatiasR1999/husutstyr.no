import assert from 'node:assert/strict';
import {readFile,writeFile,rm} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID,createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {neon} from '@neondatabase/serverless';
import '../neon-retry';
import {load} from 'cheerio';
import {startIssuer} from '../phase2/oidc-issuer';
import {qaConnection} from '../phase2/guard';
import {startQaServer} from '../qa-server';
import site from '../../site.config';
import {parseContent} from '../../src/lib/domain/content';
import {graphSchema} from '../../src/lib/seo/json-ld';
const evidence=process.env.QA_EVIDENCE_DIR??'docs/qa/phase3';
const exec=promisify(execFile),owner=neon(qaConnection()),service=neon(process.env.EDITOR_DATABASE_URL!),origin=site.qa.identity.url;
const fixture=JSON.parse(await readFile('work/phase2-fixture.json','utf8')),results:string[]=[];
const issuer=await startIssuer();let server=await startQaServer('phase3');
let cleanupArticle:{id:string;hash:string}|undefined;
const cookie=(response:Response,name:string)=>response.headers.getSetCookie().map(value=>value.split(';')[0]!).find(value=>value.startsWith(`${name}=`));
async function login(subject:string) {const begin=await fetch(new URL('/api/auth/login',origin),{redirect:'manual'});assert.equal(begin.status,303);const attempt=cookie(begin,'editor_login')!;const url=new URL(begin.headers.get('location')!);url.searchParams.set('qa_subject',subject);const grant=await fetch(url,{redirect:'manual'});const callback=await fetch(grant.headers.get('location')!,{redirect:'manual',headers:{Cookie:attempt}});assert.equal(callback.status,303);return cookie(callback,'editor_session')!;}
const post=(path:string,session:string,body:unknown)=>fetch(new URL(path,origin),{method:'POST',redirect:'manual',headers:{Cookie:session,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
async function curl(label:string,path:string) {const base=`${evidence}/${label}`;const args=['--silent','--show-error','--max-time','30','--dump-header',`${base}.headers.txt`,'--output',`${base}.html`,'--write-out','%{http_code}',new URL(path,origin).href];const response=await exec('curl',args);return {status:Number(response.stdout),body:await readFile(`${base}.html`,'utf8'),headers:await readFile(`${base}.headers.txt`,'utf8')};}
async function waitJob(id:string,editor:string) {let last:unknown;for(let i=0;i<40;i++){const response=await fetch(new URL(`/api/editor/publication/${id}`,origin),{headers:{Cookie:editor}});assert.equal(response.status,200);const row=await response.json();last=row;if(row.cache_state==='confirmed'){assert.equal(row.notification_state,'skipped');return row;}await delay(500);}throw new Error(`Publication was not confirmed: ${JSON.stringify(last)}`);}
async function worker(id:string) {return fetch(new URL('/api/publication-jobs',origin),{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.PUBLICATION_WORKER_SECRET}`},body:JSON.stringify({eventId:id})});}
try {
 const writer=await login(site.qa.markers.writer),editor=await login(site.qa.markers.editor);
 const editorHash=createHash('sha256').update(editor.slice('editor_session='.length)).digest('hex');
 const [original]=await owner`select payload from editorial.revisions where id=(select published_revision_id from editorial.articles where id=${fixture.article.id})`;
 const base=parseContent(original?.payload),title=`${site.qa.markers.publicationTitle} ${randomUUID().slice(0,8)}`;
 const copyId=randomUUID().slice(0,8);
 const payload={...base,title,seo:{title:site.qa.phase4.seoTitle.replace('{id}',copyId),description:site.qa.phase4.description.replace('{id}',copyId)},blocks:[{type:'paragraph',text:site.qa.markers.publicationBody}]};
 const created=await post('/api/editor/articles',writer,{categoryId:fixture.categoryId,content:payload});assert.equal(created.status,303);
 const id=new URL(created.headers.get('location')!).pathname.split('/').at(-1)!;
 cleanupArticle={id,hash:editorHash};
 let [article]=await owner`select * from editorial.articles where id=${id}`;assert.ok(article);assert.ok(article);const path=`/${article.namespace}/${article.slug}`;
 const command={operation:'publish',articleId:id,revisionId:article.current_revision_id,requestId:randomUUID()};
 assert.equal((await post('/api/editor/publication',editor,command)).status,403);
 assert.equal((await post('/api/editor/publication',writer,command)).status,403);
 assert.equal((await fetch(new URL('/api/publication-jobs',origin),{method:'POST',body:'{}'})).status,403);
 const approve=async(revision:string)=>{assert.equal((await post(`/api/editor/articles/${id}`,writer,{action:'submit',revisionId:revision})).status,303);assert.equal((await post(`/api/editor/articles/${id}`,editor,{action:'approve',revisionId:revision})).status,303);};
 await approve(article.current_revision_id);
 for(const [label,route] of [['warm-home','/'],['warm-category',`/${article.namespace}`]]) {
  let response=await curl(label!,route!);
  for(let retry=0;retry<20&&!/x-nextjs-cache:\s*HIT/i.test(response.headers);retry++){await delay(250);response=await curl(label!,route!);}
  assert.match(response.headers,/x-nextjs-cache:\s*HIT/i);assert.match(response.headers,/s-maxage=600(?:,|\s)/i);
 }
 await curl('warm-rss',`/${article.namespace}/rss.xml`);
 const before=await curl('draft-before-publish',path);assert.equal(before.status,404);
 const published=await post('/api/editor/publication',editor,command);assert.equal(published.status,202);const event=(await published.json()).eventId;
 const duplicate=await post('/api/editor/publication',editor,command);assert.equal(duplicate.status,202);assert.equal((await duplicate.json()).eventId,event);
 assert.equal((await owner`select id from editorial.publication_events where idempotency_key=${command.requestId}`).length,1);
 await waitJob(event,editor);
 const first=await curl('published-v1',path);assert.equal(first.status,200);assert.match(first.headers,/x-nextjs-cache:\s*HIT/i);assert.match(first.headers,/s-maxage=3600(?:,|\s)/i);
 const $=load(first.body),body=$('article').clone();body.find('script').remove();assert.ok(body.text().includes(site.qa.markers.publicationBody));assert.equal($('title').length,1);assert.equal($('meta[name="description"]').length,1);assert.equal($('link[rel="canonical"]').attr('href'),new URL(path,origin).href);graphSchema.parse(JSON.parse($('script[type="application/ld+json"]').text()));
 results.push('Approved publication became visible in actual cached HTML, lists and RSS; duplicate command returned the same event');
 assert.equal((await post('/api/editor/publication',editor,{...command,operation:'withdraw'})).status,403);
 results.push('Unapproved, writer and idempotency-key collision publication requests were denied');
 const edited={...payload,blocks:[{type:'paragraph',text:site.qa.markers.publicationUpdate}]};
 assert.equal((await post(`/api/editor/articles/${id}`,writer,{action:'save',revisionId:article.current_revision_id,content:edited})).status,303);
 [article]=await owner`select * from editorial.articles where id=${id}`;assert.ok(article);
 const pending=await curl('draft-update-keeps-public',path);assert.ok(pending.body.includes(site.qa.markers.publicationBody));assert.ok(!pending.body.includes(site.qa.markers.publicationUpdate));
 assert.equal((await post('/api/editor/publication',editor,{...command,revisionId:article.current_revision_id,requestId:randomUUID()})).status,403);
 await approve(article.current_revision_id);
 const update=await post('/api/editor/publication',editor,{...command,revisionId:article.current_revision_id,requestId:randomUUID()});assert.equal(update.status,202);await waitJob((await update.json()).eventId,editor);
 const second=await curl('published-v2',path);assert.ok(second.body.includes(site.qa.markers.publicationUpdate));assert.ok(!second.body.includes(site.qa.markers.publicationBody));
 const [dates]=await owner`select published_at,modified_at from editorial.articles where id=${id}`;assert.ok(dates?.modified_at>dates?.published_at);
 results.push('New draft preserved existing cached content; approved edit changed HTML and dateModified while preserving first publication time');
 // A real rebuild and restart exercises deployment without a database write.
 await server.stop();const rebuild=await exec('npm',['run','build'],{env:{...process.env,DATABASE_URL_UNPOOLED:''},maxBuffer:5_000_000});await writeFile(`${evidence}/rebuild.log`,rebuild.stdout+rebuild.stderr);server=await startQaServer('phase3-rebuilt');
 const afterRebuild=await curl('after-rebuild',path);assert.ok(afterRebuild.body.includes(site.qa.markers.publicationUpdate));assert.deepEqual((await owner`select published_at,modified_at from editorial.articles where id=${id}`)[0],dates);
 results.push('Actual rebuild and production-server restart preserved published dates and content');
 // Simulate a process stopping after DB commit but before cache invalidation.
 const recovered={...edited,blocks:[{type:'paragraph',text:site.qa.markers.changed}]};
 assert.equal((await post(`/api/editor/articles/${id}`,writer,{action:'save',revisionId:article.current_revision_id,content:recovered})).status,303);
 [article]=await owner`select * from editorial.articles where id=${id}`;assert.ok(article);await approve(article.current_revision_id);
 const recoveryKey=randomUUID();const [outbox]=await service`select editorial.change_publication(${editorHash},${id},${article.current_revision_id},'publish',${recoveryKey}) as id`;
 const stale=await curl('committed-before-invalidation',path);assert.ok(stale.body.includes(site.qa.markers.publicationUpdate));assert.ok(!stale.body.includes(site.qa.markers.changed));
 await owner`update editorial.publication_jobs set next_attempt_at=now()+interval '1 hour' where event_id=${outbox?.id}`;
 assert.equal((await post('/api/editor/publication',writer,{operation:'retry',articleId:id,eventId:outbox?.id})).status,403);
 assert.equal((await post('/api/editor/publication',editor,{operation:'retry',articleId:id,eventId:outbox?.id})).status,202);await waitJob(outbox?.id,editor);
 const recoveredHtml=await curl('recovered-cache',path);assert.ok(recoveredHtml.body.includes(site.qa.markers.changed));assert.ok(!recoveredHtml.body.includes(site.qa.markers.publicationUpdate));
 const [attempts]=await owner`select attempts from editorial.publication_jobs where event_id=${outbox?.id}`;await worker(outbox?.id);await delay(200);assert.equal((await owner`select attempts from editorial.publication_jobs where event_id=${outbox?.id}`)[0]?.attempts,attempts?.attempts);
 results.push('Persisted job recovered a real stale cache after a simulated post-commit interruption; completed job did not run twice');
 // Publishing identical approved content must not fabricate a newer lastmod.
 const [stable]=await owner`select modified_at from editorial.articles where id=${id}`;
 assert.equal((await post(`/api/editor/articles/${id}`,writer,{action:'save',revisionId:article.current_revision_id,content:recovered})).status,303);[article]=await owner`select * from editorial.articles where id=${id}`;assert.ok(article);await approve(article.current_revision_id);
 const same=await post('/api/editor/publication',editor,{...command,revisionId:article.current_revision_id,requestId:randomUUID()});await waitJob((await same.json()).eventId,editor);assert.deepEqual((await owner`select modified_at from editorial.articles where id=${id}`)[0],stable);results.push('Identical content approval and publication preserve lastmod');
 const withdrawn=await post('/api/editor/publication',editor,{operation:'withdraw',articleId:id,revisionId:article.current_revision_id,requestId:randomUUID()});assert.equal(withdrawn.status,202);const removed=await curl('withdrawn-immediate',path);assert.equal(removed.status,410);assert.match(removed.headers,/noindex/i);await waitJob((await withdrawn.json()).eventId,editor);
 for(const route of ['/',`/${article.namespace}`,`/${article.namespace}/rss.xml`]) {const response=await fetch(new URL(route,origin));assert.ok(!(await response.text()).includes(path));}
 assert.equal((await fetch(new URL(path,origin),{headers:{RSC:'1'}})).status,410);assert.equal((await fetch(new URL(`${path}/opengraph-image`,origin))).status,410);
 const sitemap=await fetch(new URL('/sitemap.xml',origin));const sitemapXml=await sitemap.text();assert.equal(load(sitemapXml,{xml:true})('sitemapindex').length,1);assert.equal(load(sitemapXml,{xml:true})('loc').length,0);
 const robots=await fetch(new URL('/robots.txt',origin));assert.ok((await robots.text()).includes(`Sitemap: ${origin}/sitemap.xml`));
 results.push('Withdrawal blocked stale HTML/RSC immediately with 410 and removed list, RSS and OG access; QA sitemap stayed empty');
 const suffix=randomUUID().slice(0,8),target=`/${site.qa.article.categorySlug}/${site.qa.article.slug}`,a=`/old-${suffix}`,b=`/older-${suffix}`;
 assert.equal((await post('/api/editor/redirects',writer,{source:a,destination:target,status:301})).status,403);
 assert.equal((await post('/api/editor/redirects',editor,{source:b,destination:target,status:301})).status,200);
 assert.equal((await post('/api/editor/redirects',editor,{source:a,destination:b,status:301})).status,200);
 const redirect=await fetch(new URL(`${a}/?page=1`,origin),{redirect:'manual'});assert.equal(redirect.status,301);assert.equal(new URL(redirect.headers.get('location')!,origin).href,new URL(target,origin).href);
 assert.equal((await post('/api/editor/redirects',editor,{source:a,destination:a,status:301})).status,403);
 assert.equal((await post('/api/editor/redirects',editor,{source:a,destination:'https://example.invalid',status:301})).status,403);
 const gone=`/gone-${suffix}`;assert.equal((await post('/api/editor/redirects',editor,{source:gone,destination:null,status:410})).status,200);assert.equal((await fetch(new URL(gone,origin))).status,410);assert.equal((await fetch(new URL(`/unknown-${suffix}`,origin))).status,404);
 results.push('Redirect chains were flattened to one 301 including slash normalization; self-cycles and external destinations were rejected; tombstones gave 410 and unknown routes 404');
 const cycleA=`/cycle-a-${suffix}`,cycleB=`/cycle-b-${suffix}`;
 await owner`insert into editorial.redirects(site_id,is_test,from_path,to_path,status) values(${site.id},true,${cycleA},${cycleB},301),(${site.id},true,${cycleB},${cycleA},301)`;
 assert.equal((await fetch(new URL(cycleA,origin),{redirect:'manual'})).status,500);results.push('A deliberately corrupted cyclic QA redirect map failed closed without an HTTP redirect loop');
 const history=await owner`select event,processed_at from editorial.publication_events where article_id=${id} order by created_at`;
 assert.equal(history.filter(row=>row.event==='withdraw').length,1);assert.ok(history.every(row=>row.processed_at));
 await writeFile(`${evidence}/publication-tests.json`,JSON.stringify({checkedAt:new Date().toISOString(),passed:results.length,results,articleId:id,history},null,2)+'\n');
 console.log(`PASS: ${results.length} real publication, recovery, cache, rebuild, feed and redirect checks.`);
 await post('/api/auth/logout',writer,{});await post('/api/auth/logout',editor,{});
} finally {
 let needsFreshBuild=false;
 try {
  if(cleanupArticle){const [current]=await owner`select current_revision_id,published_revision_id from editorial.articles where id=${cleanupArticle.id} and is_test=true`;
   if(current?.published_revision_id){needsFreshBuild=true;const [event]=await service`select editorial.change_publication(${cleanupArticle.hash},${cleanupArticle.id},${current.current_revision_id},'withdraw',${randomUUID()}) as id`;
    try{await worker(String(event!.id));}catch{needsFreshBuild=true;}
   }
  }
 }finally{await server.stop();await issuer.stop();if(needsFreshBuild)await rm('.next/cache/fetch-cache',{recursive:true,force:true});}
}
