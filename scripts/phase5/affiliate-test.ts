import assert from 'node:assert/strict';
import {neon} from '@neondatabase/serverless';
import {createHash,randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createServer} from 'node:http';
import {load} from 'cheerio';
import AxeBuilder from '@axe-core/playwright';
import site from '../../site.config';
import {graphSchema} from '../../src/lib/seo/json-ld';
import {qaConnection} from '../phase2/guard';
import {startQaServer} from '../qa-server';

const owner=neon(qaConnection()),reader=neon(process.env.DATABASE_URL!),exec=promisify(execFile),origin=site.qa.identity.url,evidence=process.env.QA_EVIDENCE_DIR??'docs/qa/phase5';
const fixture=JSON.parse(await readFile('work/phase5-fixture.json','utf8')) as {links:{id:string;slug:string;relationship:string}[];articles:{id:string;path:string;relationship:string}[]};
const identities=JSON.parse(await readFile('work/phase2-fixture.json','utf8')) as {identities:{editor:string;writer:string}};
const tokens={editor:randomUUID(),writer:randomUUID()},hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const results:string[]=[],visuals:unknown[]=[];
let destinationHits=0;
const destinationServer=createServer((_request,response)=>{destinationHits++;response.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});response.end(site.qa.phase5.link);});
for(const role of ['editor','writer'] as const)await owner`insert into editorial.sessions(token_hash,principal_id,expires_at) values(${hash(tokens[role])},${identities.identities[role]},now()+interval '30 minutes')`;
const server=await startQaServer('phase5-affiliate');
async function raw(name:string,path:string) {const base=`${evidence}/${name}`;const response=await exec('curl',['-sS','--max-time','45','-D',`${base}.headers.txt`,'-o',`${base}.html`,'-w','%{http_code}',new URL(path,origin).href]);return {status:Number(response.stdout),body:await readFile(`${base}.html`,'utf8'),headers:await readFile(`${base}.headers.txt`,'utf8')};}
const post=(body:unknown,role:'editor'|'writer',requestOrigin:string=origin)=>fetch(new URL('/api/editor/affiliate-links',origin),{method:'POST',headers:{Origin:requestOrigin,Cookie:`editor_session=${tokens[role]}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
try {
 const destinationOrigin=new URL(site.qa.phase5.destinationOrigin);
 await new Promise<void>((resolve,reject)=>{destinationServer.once('error',reject);destinationServer.listen(Number(destinationOrigin.port),destinationOrigin.hostname,resolve);});
 const registered={slug:`qa-registered-${randomUUID().slice(0,8)}`,destination:site.qa.phase5.destination,disclosure:site.qa.phase5.disclosure,relationship:'commission'};
 assert.equal((await fetch(new URL('/api/editor/affiliate-links',origin),{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(registered)})).status,401);
 assert.equal((await post(registered,'writer')).status,403);assert.equal((await post(registered,'editor',site.qa.phase5.destinationOrigin)).status,403);
 assert.equal((await post({...registered,destination:`${site.qa.phase5.destinationOrigin}.invalid/`},'editor')).status,400);
 assert.equal((await post(registered,'editor')).status,201);
 assert.equal((await raw('registered-but-unused',`/go/${registered.slug}`)).status,404);
 await assert.rejects(()=>reader`select destination from editorial.affiliate_links`);
 await assert.rejects(()=>owner`update editorial.affiliate_links set destination=${`${site.qa.phase5.destinationOrigin}/changed`} where id=${fixture.links[0]!.id}`);
 results.push('Only editors can register immutable allowlisted destinations; unused and draft links stay private');
 for(const link of fixture.links){const response=await raw(`go-${link.relationship}`,`/go/${link.slug}`);assert.equal(response.status,link.relationship==='private'?404:302);assert.match(response.headers,/x-robots-tag: noindex/i);assert.match(response.headers,/cache-control: private, no-store/i);if(link.relationship!=='private'){assert.match(response.headers,new RegExp(`location: ${site.qa.phase5.destination.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`,'i'));assert.equal((await fetch(new URL(`/go/${link.slug}`,origin),{method:'HEAD',redirect:'manual'})).status,302);}}
 for(const path of ['/go/unknown','/go/qa-phase5-commission?url=https%3A%2F%2Foutside.invalid','/go/qa-phase5-commission?destination=bad'])assert.equal((await raw(`invalid-${randomUUID().slice(0,8)}`,path)).status,404);
 const link=fixture.links.find(link=>link.relationship==='commission')!;
 try{await owner`select editorial.set_affiliate_enabled(${hash(tokens.editor)},${link.id},false)`;assert.equal((await raw('disabled-link',`/go/${link.slug}`)).status,404);}finally{await owner`select editorial.set_affiliate_enabled(${hash(tokens.editor)},${link.id},true)`;}
 results.push('Actual GET/HEAD redirects are 302; manipulated, unknown, disabled and draft destinations are 404 with noindex');
 assert.match(await (await fetch(new URL('/robots.txt',origin))).text(),/Disallow: \/\n/);
 process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('work/playwright');const {chromium}=await import('@playwright/test');const browser=await chromium.launch({headless:true});
 try {
  for(const article of fixture.articles.filter(article=>article.relationship!=='private')) {
   const response=await raw(`article-${article.relationship}`,article.path);assert.equal(response.status,200);const $=load(response.body);
   assert.ok($('article').text().includes(site.qa.article.body[0]));assert.equal($('title').length,1);assert.equal($('meta[name="description"]').length,1);assert.equal($('link[rel="canonical"]').length,1);assert.equal($('link[rel="canonical"]').attr('href'),new URL(article.path,origin).href);graphSchema.parse(JSON.parse($('script[type="application/ld+json"]').text()));
   assert.equal($('a[href^="/go/"]').attr('rel'),'sponsored nofollow noopener');assert.equal($('[data-commercial-notice]').length,1);assert.ok($('[data-commercial-notice]').text().includes(article.relationship==='owned'?site.affiliate.ownedDisclosure:site.affiliate.disclosure));
   for(const viewport of [{width:390,height:844},{width:1440,height:1000}]) {
    const context=await browser.newContext({viewport,javaScriptEnabled:false}),page=await context.newPage();const previousHits=destinationHits;
    await page.goto(new URL(article.path,origin).href);const box=await page.locator('[data-commercial-notice]').boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<=viewport.height,'Advertising disclosure must be entirely within the initial viewport');
    const ad=await page.locator('a[href^="/go/"]').boundingBox();assert.ok(ad&&box.y<ad.y);await page.screenshot({path:`${evidence}/affiliate-${article.relationship}-${viewport.width}.png`,fullPage:true});
    await page.locator('a[href^="/go/"]').click();await page.waitForURL(site.qa.phase5.destination);assert.ok(destinationHits>previousHits);await context.close();
    const auditContext=await browser.newContext({viewport}),auditPage=await auditContext.newPage();await auditPage.goto(new URL(article.path,origin).href,{waitUntil:'networkidle'});const audit=await new AxeBuilder({page:auditPage}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(audit.violations,[]);visuals.push({article:article.relationship,viewport,disclosureVisibleWithoutJavaScript:true,navigationWithoutJavaScript:true,violations:0});await auditContext.close();
   }
  }
 }finally{await browser.close();}
 results.push('Server HTML contains content, metadata, validated JSON-LD and mandatory advertising labels; four viewport/keyboard-independent navigation and accessibility checks pass');
 const report={checkedAt:new Date().toISOString(),results,visuals,consent:'APPROVED; detailed network evidence is in consent.json'};
 await writeFile(`${evidence}/affiliate.json`,JSON.stringify(report,null,2)+'\n');
 console.log(`PASS: ${results.length} affiliate test groups and ${visuals.length} responsive accessibility/navigation checks.`);
}finally{await server.stop();if(destinationServer.listening)await new Promise<void>(resolve=>destinationServer.close(()=>resolve()));for(const token of Object.values(tokens))await owner`delete from editorial.sessions where token_hash=${hash(token)}`;}
