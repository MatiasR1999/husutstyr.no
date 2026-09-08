import assert from 'node:assert/strict';
import {neon} from '@neondatabase/serverless';
import {createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {resolve} from 'node:path';
import {load} from 'cheerio';
import {z} from 'zod';
import AxeBuilder from '@axe-core/playwright';
import site from '../../site.config';
import {graphSchema} from '../../src/lib/seo/json-ld';
import {normalizedAnchor} from '../../src/lib/network/policy';
import {qaConnection} from '../phase2/guard';
import {startQaServer} from '../qa-server';
const owner=neon(qaConnection()),reader=neon(process.env.DATABASE_URL!),service=neon(process.env.EDITOR_DATABASE_URL!),origin=site.qa.identity.url,evidence=process.env.QA_EVIDENCE_DIR??'docs/qa/phase6',config=site.qa.phase6,exec=promisify(execFile);
const fixture=JSON.parse(await readFile('work/phase6-fixture.json','utf8')) as {articles:Record<string,{id:string;revisionId:string;path:string}>},main=fixture.articles.main!;
const identities=JSON.parse(await readFile('work/phase2-fixture.json','utf8')) as {identities:{editor:string;writer:string}};
const tokens={editor:randomUUID(),writer:randomUUID()},hash=(value:string)=>createHash('sha256').update(value).digest('hex'),results:string[]=[],visuals:unknown[]=[],http:unknown[]=[];
for(const role of ['editor','writer'] as const)await owner`insert into editorial.sessions(token_hash,principal_id,expires_at) values(${hash(tokens[role])},${identities.identities[role]},now()+interval '30 minutes')`;
let server=await startQaServer('phase6-off',true,false,'false');
const input={articleId:main.id,revisionId:main.revisionId,blockIndex:3,anchor:config.firstAnchor,peerId:site.qa.network.sites[0].id,destination:`${config.origin}/guide`,topicSlug:config.topic,justification:config.justification,placement:'body',relationship:'editorial'};
const request=(path:string,body:unknown,role:'editor'|'writer'='editor',method='POST',requestOrigin:string=origin)=>fetch(new URL(path,origin),{method,headers:{Origin:requestOrigin,Cookie:`editor_session=${tokens[role]}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
const register=(body:unknown,role:'editor'|'writer'='editor')=>request('/api/editor/network-links',body,role);
async function invalidate(){const response=await request('/api/editor/network-links/revalidate',{});assert.equal(response.status,200);assert.match(response.headers.get('cache-control')??'',/no-store/);assert.match(response.headers.get('x-robots-tag')??'',/noindex/);}
async function raw(label:string,count:number,rsc=false,path=main.path){
 const base=`${evidence}/${label}`;
 const response=await exec('curl',['-sS','--max-time','45','-D',`${base}.headers.txt`,'-o',`${base}.${rsc?'rsc':'html'}`,'-w','%{http_code}',...(rsc?['-H','RSC: 1','--location','--max-redirs','2']:[]),new URL(path,origin).href]);
 assert.equal(Number(response.stdout),200);const body=await readFile(`${base}.${rsc?'rsc':'html'}`,'utf8'),headers=await readFile(`${base}.headers.txt`,'utf8');
 if(!count)for(const marker of [config.origin,config.secondOrigin,...site.qa.network.sites.map(peer=>peer.id)])assert.equal(body.includes(marker),false,`${label} must not expose network data`);
 if(rsc){assert.match(headers,/text\/x-component/);assert.equal((body.match(/data-network-link/g)??[]).length,count);}
 else {const $=load(body);assert.equal($('a[data-network-link]').length,count);assert.ok($('article').text().includes(site.qa.article.body[0]));assert.equal($('title').length,1);assert.equal($('meta[name="description"]').length,1);assert.equal($('link[rel="canonical"]').length,1);assert.equal($('link[rel="canonical"]').attr('href'),new URL(path,origin).href);graphSchema.parse(JSON.parse($('script[type="application/ld+json"]').text()));assert.equal($('footer a[data-network-link],aside a[data-network-link]').length,0);assert.equal($('article .article-body p a[data-network-link]').length,count);for(const marker of [config.origin,config.secondOrigin]){assert.equal($('head').html()?.includes(marker),false);assert.equal($('script[type="application/ld+json"]').text().includes(marker),false);}}
 http.push({label,rsc,count,cache:headers.match(/x-nextjs-cache: (\w+)/i)?.[1]??null});return {body,headers};
}
try{
 await invalidate();assert.equal((await register(input)).status,409);
 assert.equal((await fetch(new URL('/api/editor/network-links/revalidate',origin),{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'})).status,403);
 assert.equal((await request('/api/editor/network-links/revalidate',{},'writer')).status,403);assert.equal((await request('/api/editor/network-links/revalidate',{},'editor','POST',config.origin)).status,403);
 try{await owner`revoke select on editorial.public_network_links from seo_public_reader`;await assert.rejects(()=>reader`select * from editorial.public_network_links`);await invalidate();await raw('false-no-network-permission',0);await raw('false-no-network-permission-rsc',0,true);}finally{await owner`grant select on editorial.public_network_links to seo_public_reader`;}
 results.push('False mode renders fresh HTML/RSC without network data even when the database reader has no network-view permission');
 await server.stop();server=await startQaServer('phase6-on',true,false,'true');await invalidate();
 assert.equal((await register(input,'writer')).status,403);
 for(const change of [{placement:'footer'},{placement:'sidebar'},{relationship:'reciprocal'},{reciprocity:true},{activateAfterDays:30},{approvedBy:identities.identities.editor},{destination:`${config.origin}.attacker.invalid/guide`},{destination:`${config.origin}/guide?person=private`},{topicSlug:'unrelated'},{blockIndex:0}])assert.equal((await register({...input,...change})).status,400);
 for(const kind of ['draft','unrelated'])assert.equal((await register({...input,articleId:fixture.articles[kind]!.id,revisionId:fixture.articles[kind]!.revisionId})).status,400);
 await assert.rejects(()=>service`select * from editorial.network_links`);await assert.rejects(()=>reader`select * from editorial.network_links`);
 await assert.rejects(()=>owner`select editorial.register_network_link(${hash(tokens.writer)},${JSON.stringify({...input,registryVersion:1})}::jsonb)`);
 const first=await register(input);assert.equal(first.status,201);const firstId=z.object({id:z.uuid()}).parse(await first.json()).id;
 await assert.rejects(()=>owner`update editorial.network_links set destination=${`${config.origin}/changed`} where id=${firstId}`);
 const [normalized]=await owner`select editorial.network_anchor(${`  ${config.firstAnchor.toLocaleUpperCase('nb').replaceAll(' ','\u00a0\u00a0')} `}) as value`;assert.equal(normalized!.value,normalizedAnchor(config.firstAnchor));
 assert.equal((await register({...input,articleId:fixture.articles.duplicate!.id,revisionId:fixture.articles.duplicate!.revisionId,anchor:config.firstAnchor.toLocaleUpperCase('nb')})).status,400);
 assert.equal((await register({...input,anchor:config.firstAnchor.slice(3)})).status,400);
 assert.equal((await register(input)).status,400);
 results.push('Only editors can approve immutable, relevant links on approved revisions; forged approvals, foreign destinations, private drafts, footer/sidebar rules, duplicate and overlapping anchors are rejected');
 const candidates=[{...input,anchor:config.secondAnchor,peerId:site.qa.network.sites[1].id,destination:`${config.secondOrigin}/second`},{...input,anchor:config.thirdAnchor,peerId:site.qa.network.sites[1].id,destination:`${config.secondOrigin}/third`}];
 const concurrent=await Promise.all(candidates.map(candidate=>register(candidate)));assert.deepEqual(concurrent.map(response=>response.status).sort(),[201,400]);
 const secondIndex=concurrent.findIndex(response=>response.status===201),secondInput=candidates[secondIndex]!;
 const [total]=await reader`select count(*)::int as count from editorial.public_network_links where article_id=${main.id}`;assert.equal(total!.count,2);
 await raw('enabled-two-links',2);const warm=await raw('enabled-warm-cache',2);assert.match(warm.headers,/x-nextjs-cache: HIT/i);await raw('enabled-rsc',2,true);
 for(const path of ['/','/kontroll','/forfatter/qa-testidentitet']){const body=await(await fetch(new URL(path,origin))).text();assert.equal(body.includes(config.origin),false);assert.equal(body.includes(config.secondOrigin),false);}
 results.push('Concurrent registration cannot exceed two links; real warm-cache HTML and RSC contain only contextual article links and no sitewide network blocks');
 process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('work/playwright');const {chromium}=await import('@playwright/test'),browser=await chromium.launch({headless:true});
 try{for(const viewport of [{width:390,height:844},{width:1440,height:1000}]){const context=await browser.newContext({viewport}),page=await context.newPage();const external:string[]=[];page.on('request',request=>{if(new URL(request.url()).origin!==origin)external.push(request.url());});await page.goto(new URL(main.path,origin).href,{waitUntil:'networkidle'});assert.equal(await page.locator('a[data-network-link]').count(),2);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(audit.violations,[]);assert.deepEqual(external,[]);await page.screenshot({path:`${evidence}/network-${viewport.width}.png`,fullPage:true});visuals.push({viewport,violations:0,externalRequests:0});await context.close();}}finally{await browser.close();}
 assert.equal((await request('/api/editor/network-links',{id:firstId,enabled:false},'editor','PATCH')).status,200);await raw('link-revoked',1);
 assert.equal((await request('/api/editor/network-links',{id:firstId,enabled:true},'editor','PATCH')).status,200);await raw('link-restored',2);
 await server.stop();server=await startQaServer('phase6-rollback',true,false,'false');await raw('rollback-before-invalidation',0);await invalidate();await raw('rollback-after-invalidation',0);await raw('rollback-rsc',0,true);
 await server.stop();server=await startQaServer('phase6-unset',true,false,'unset');await raw('unset-html',0);await raw('unset-rsc',0,true);
 results.push('Switching the same built application from true to false/unset never reuses cached linked HTML; controlled revalidation clears both cache modes and RSC');
 await server.stop();server=await startQaServer('phase6-revision',true,false,'true');await raw('reenabled-after-rollback',2);
 const [original]=await owner`select payload from editorial.revisions where id=${main.revisionId}`;
 const [next]=await owner`select editorial.save_revision(${hash(tokens.editor)},${main.id},${main.revisionId},${JSON.stringify(original!.payload)}::jsonb) as id`;const revision=z.uuid().parse(next!.id);
 await invalidate();await raw('draft-keeps-published-links',2);
 await owner`select editorial.submit_revision(${hash(tokens.editor)},${main.id},${revision})`;await owner`select editorial.approve_revision(${hash(tokens.editor)},${main.id},${revision})`;await owner`select editorial.change_publication(${hash(tokens.editor)},${main.id},${revision},'publish',${randomUUID()})`;
 await invalidate();await raw('new-revision-needs-link-approval',0);
 assert.equal((await register({...input,revisionId:revision})).status,201);assert.equal((await register({...secondInput,revisionId:revision})).status,201);await raw('same-article-new-approvals',2);
 results.push('A draft preserves published links; a new published revision needs new link approvals while retaining its own site-wide anchor reservations');
 await server.stop();server=await startQaServer('phase6-final-off',true,false,'false');await invalidate();await raw('final-off',0);await raw('final-off-rsc',0,true);
 const internal=await fetch(new URL('/visninger/artikkel/off/ignored',origin));assert.equal(internal.status,404);
 await writeFile(`${evidence}/network.json`,JSON.stringify({checkedAt:new Date().toISOString(),results,http,visuals,concurrentStatuses:[201,400],modes:['false','true','false','unset','true','false'],rebuiltBetweenModes:false,finalMode:'false',productionChanged:false},null,2)+'\n');console.log(`PASS: ${results.length} database/HTTP network groups, two accessibility checks and same-build cache rollback.`);
}finally{await server.stop();for(const token of Object.values(tokens))await owner`delete from editorial.sessions where token_hash=${hash(token)}`;}
