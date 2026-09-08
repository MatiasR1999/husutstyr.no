import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
import {load} from 'cheerio';
import AxeBuilder from '@axe-core/playwright';
import type {BrowserContext,Page} from '@playwright/test';
import site from '../../site.config';
import {analyticsConsent} from '../../src/lib/measurement/policy';
import {startQaServer} from '../qa-server';
import {finalTemplateProfile} from '../performance-profile';

process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('work/playwright');
const {chromium}=await import('@playwright/test');
const origin=site.qa.identity.url,collector=site.qa.phase5.collectorOrigin,path='/kontroll/qa-phase5-commission',evidence=process.env.QA_EVIDENCE_DIR??'docs/qa/phase5';
const providers={analytics:await readFile('work/vercel-analytics-provider.js'),speed:await readFile('work/vercel-speed-provider.js')};
const network:{path:string;method:string;body:string;cookie:string;referer:string}[]=[],results:string[]=[],audits:unknown[]=[];
const receiver=createServer(async(request,response)=>{
 let body='';for await(const chunk of request)body+=String(chunk);
 network.push({path:request.url??'',method:request.method??'',body,cookie:request.headers.cookie??'',referer:request.headers.referer??''});
 response.setHeader('Access-Control-Allow-Origin','*');response.setHeader('Access-Control-Allow-Headers','Content-Type');response.setHeader('Cache-Control','no-store');
 if(request.method==='OPTIONS'){response.writeHead(204);response.end();return;}
 if(request.url==='/analytics.js'||request.url==='/speed.js'){response.setHeader('Content-Type','application/javascript');response.end(request.url==='/analytics.js'?providers.analytics:providers.speed);return;}
 response.writeHead(204);response.end();
});
let navigations=0;const destination=createServer((_request,response)=>{navigations++;response.end(site.qa.phase5.link);});
const listen=(server:ReturnType<typeof createServer>,url:string)=>new Promise<void>((resolve,reject)=>{const value=new URL(url);server.once('error',reject);server.listen(Number(value.port),value.hostname,resolve);});
const close=(server:ReturnType<typeof createServer>)=>new Promise<void>(resolve=>server.close(()=>resolve()));
await listen(receiver,collector);await listen(destination,site.qa.phase5.destinationOrigin);
const server=await startQaServer('phase5-consent'),browser=await chromium.launch({headless:true});
const external:string[]=[],browserErrors:string[]=[],transport:{url:string;consented:boolean}[]=[];
async function context(viewport={width:390,height:844}):Promise<BrowserContext>{
 // The unmodified Vercel production scripts skip webdriver/headless UAs. Disable that test-only signal so real provider code runs.
 const context=await browser.newContext({viewport,userAgent:`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browser.version()} Safari/537.36`});
 await context.exposeFunction('__qaTransport',(url:string,cookie:string)=>{transport.push({url,consented:analyticsConsent(cookie,site.consent)});});
 await context.addInitScript({content:`const originalFetch=window.fetch;window.fetch=function(input,init){const url=String(input);if(url.startsWith(${JSON.stringify(collector)}))window.__qaTransport(url,document.cookie);return originalFetch.call(this,input,init);};`});
 await context.addInitScript({content:"Object.defineProperty(navigator,'webdriver',{get:()=>false});"});
 context.on('page',page=>{page.on('pageerror',error=>browserErrors.push(error.message));page.on('console',message=>{if(message.type()==='error')browserErrors.push(message.text());});});
 context.on('request',request=>{if(!['127.0.0.1','localhost'].includes(new URL(request.url()).hostname))external.push(request.url());});
 return context;
}
const settle=(page:Page)=>page.waitForTimeout(500);
const banner=(page:Page)=>page.locator('#cc-main .cm');
async function open(page:Page,url=path){await page.goto(new URL(url,origin).href,{waitUntil:'networkidle'});await page.locator('[data-consent-settings]').waitFor();await settle(page);}
async function cookieState(context:BrowserContext){const cookies=await context.cookies();assert.deepEqual(cookies.map(cookie=>cookie.name),[site.consent.cookieName]);const cookie=cookies[0]!;assert.ok(Math.abs(cookie.expires-Date.now()/1000-180*86400)<30);assert.equal(cookie.sameSite,'Lax');return JSON.parse(decodeURIComponent(cookie.value)) as {categories:string[];revision:number;consentId:string;consentTimestamp:string;lastConsentTimestamp:string};}
async function storage(page:Page){assert.deepEqual(await page.evaluate(()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage)})),{local:[],session:[]});}
async function consentState(page:Page){return page.evaluate(()=>(window.dataLayer??[]).map(item=>Array.from(item as ArrayLike<unknown>)));}
const posts=()=>network.filter(request=>request.method==='POST');
const clicks=()=>posts().filter(request=>request.path==='/analytics/event');
try {
 const fresh=await context(),page=await fresh.newPage();await open(page);await banner(page).waitFor({state:'visible'});
 assert.equal(network.length,0);assert.deepEqual(await fresh.cookies(),[]);await storage(page);
 const defaults=await consentState(page);assert.deepEqual(defaults[0],['consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'}]);
 await banner(page).getByRole('button',{name:site.consent.ui.customize,exact:true}).click();await settle(page);assert.equal(network.length,0);assert.deepEqual(await fresh.cookies(),[]);
 await page.getByRole('button',{name:site.consent.ui.save,exact:true}).click();const rejected=await cookieState(fresh);assert.deepEqual(rejected.categories,['necessary']);assert.equal(network.length,0);await page.reload({waitUntil:'networkidle'});await settle(page);assert.equal(network.length,0);await storage(page);await fresh.close();
 results.push('No choice, opening preferences, necessary-only save and persisted refusal make zero provider requests; only a 180-day choice cookie is stored');
 for(const viewport of [{width:390,height:844},{width:1440,height:1000}]){
  const auditContext=await context(viewport),auditPage=await auditContext.newPage();await open(auditPage);await banner(auditPage).waitFor({state:'visible'});
  for(const name of [site.consent.ui.accept,site.consent.ui.reject,site.consent.ui.customize])assert.ok(await banner(auditPage).getByRole('button',{name,exact:true}).isVisible());
  assert.equal(await auditPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const primary=await banner(auditPage).getByRole('button',{name:site.consent.ui.accept,exact:true}).evaluate(element=>getComputedStyle(element).backgroundColor),secondary=await banner(auditPage).getByRole('button',{name:site.consent.ui.reject,exact:true}).evaluate(element=>getComputedStyle(element).backgroundColor);assert.equal(primary,secondary);
  let audit=await new AxeBuilder({page:auditPage}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(audit.violations,[]);
  await auditPage.screenshot({path:`${evidence}/consent-banner-${viewport.width}.png`,fullPage:true});
  await banner(auditPage).getByRole('button',{name:site.consent.ui.customize,exact:true}).focus();await auditPage.keyboard.press('Enter');await auditPage.getByRole('button',{name:site.consent.ui.save,exact:true}).waitFor();await settle(auditPage);
  audit=await new AxeBuilder({page:auditPage}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(audit.violations,[]);
  await auditPage.screenshot({path:`${evidence}/consent-preferences-${viewport.width}.png`,fullPage:true});
  audits.push({viewport,bannerViolations:0,preferencesViolations:0,equalButtonWeight:true,keyboardPreferences:true});await auditContext.close();
 }
 results.push('Mobile and desktop consent and preferences pass accessibility, keyboard, equal-button and overflow checks');
 const grantedContext=await context(),granted=await grantedContext.newPage();await open(granted);await granted.evaluate(()=>history.replaceState(null,'','?email=private-marker#private-fragment'));await banner(granted).getByRole('button',{name:site.consent.ui.accept,exact:true}).click();
 await granted.waitForFunction(()=>window.vai===true&&window.sil===true);await settle(granted);const accepted=await cookieState(grantedContext);assert.ok(accepted.categories.includes('analytics'));
 assert.ok(posts().some(request=>request.path==='/analytics/view'));
 await granted.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await settle(granted);assert.ok(posts().some(request=>request.path==='/vitals'));
 const before=clicks().length,previousNavigation=navigations;
 await granted.locator('a[href^="/go/"]').evaluate(anchor=>anchor.setAttribute('target','_blank'));
 const popup=grantedContext.waitForEvent('page');await granted.locator('a[href^="/go/"]').click();const destinationPage=await popup;await destinationPage.waitForURL(site.qa.phase5.destination);await settle(granted);assert.ok(navigations>previousNavigation);assert.equal(clicks().length,before+1);await destinationPage.close();
 const event=JSON.parse(clicks().at(-1)!.body) as {en:string;ed:Record<string,string>;o:string};assert.equal(event.en,site.measurement.eventName);assert.deepEqual(Object.keys(event.ed).sort(),['articleId','destination','linkId','placement']);assert.equal(event.ed.destination,site.qa.phase5.destinationOrigin);assert.match(event.ed.placement!,/^body-\d+$/);assert.equal(event.o,new URL(path,origin).href);
 await storage(granted);assert.equal(JSON.stringify(posts()).includes('private-marker'),false);assert.equal(JSON.stringify(posts()).includes(accepted.consentId),false);assert.equal(posts().some(request=>request.cookie||request.referer),false);
 results.push('Unmodified Vercel scripts send actual pageview, vital and exactly one affiliate event to the local receiver after opt-in; payloads omit URL parameters, referrer, consent ID and cookies');
 await granted.evaluate(path=>history.replaceState(null,'',path),path);
 const second=await grantedContext.newPage();await open(second);await second.waitForFunction(()=>window.vai===true);await settle(second);
 await granted.locator('[data-consent-settings]').click();await granted.getByRole('button',{name:site.consent.ui.reject,exact:true}).waitFor();
 const grantedBeforeWithdrawal=transport.length;
 await Promise.all([granted.waitForEvent('framenavigated'),granted.getByRole('button',{name:site.consent.ui.reject,exact:true}).click()]);await granted.waitForLoadState('networkidle');await second.waitForLoadState('networkidle');await settle(granted);
 assert.deepEqual((await cookieState(grantedContext)).categories,['necessary']);const countAfterWithdrawal=posts().length;assert.ok(transport.slice(grantedBeforeWithdrawal).every(request=>request.consented));
 await granted.evaluate(async url=>{window.va?.('event',{name:'withdrawn-probe'});window.dispatchEvent(new Event('pagehide'));await fetch(`${url}/analytics/event`,{method:'POST',body:'withdrawn-probe'});navigator.sendBeacon(`${url}/vitals`,'withdrawn-probe');},collector);
 await second.evaluate(()=>{window.va?.('event',{name:'cross-tab-withdrawn-probe'});window.dispatchEvent(new Event('pagehide'));});await settle(granted);assert.equal(posts().length,countAfterWithdrawal);
 assert.equal((await consentState(granted)).some(item=>JSON.stringify(item).includes('granted')),false);
 await granted.locator('[data-consent-settings]').click();await granted.getByRole('button',{name:site.consent.ui.accept,exact:true}).click();await granted.waitForFunction(()=>window.vai===true&&window.sil===true);await settle(granted);
 const beforeKeyboard=clicks().length;await granted.locator('a[href^="/go/"]').evaluate(anchor=>anchor.setAttribute('target','_blank'));await granted.locator('a[href^="/go/"]').focus();
 const keyboardPopup=grantedContext.waitForEvent('page');await granted.keyboard.press('Enter');const keyboardDestination=await keyboardPopup;await keyboardDestination.waitForURL(site.qa.phase5.destination);await settle(granted);assert.equal(clicks().length,beforeKeyboard+1);await keyboardDestination.close();
 await grantedContext.clearCookies();const afterDeletion=posts().length;
 await granted.evaluate(async url=>{window.va?.('event',{name:'deleted-choice-probe'});await fetch(`${url}/analytics/event`,{method:'POST',body:'deleted-choice-probe'});},collector);await settle(granted);assert.equal(posts().length,afterDeletion);await grantedContext.close();
 results.push('Renewed consent permits exactly one keyboard click; deleting the cookie blocks already-loaded provider code immediately');
 results.push('Withdrawal reloads into refusal, notifies another open tab and blocks later queued events, pagehide flushes, fetch and beacon transport');
 for(const scenario of ['expired','policy-change','malformed'] as const){
  const isolated=await context();const old={...accepted,...(scenario==='policy-change'?{revision:0}:scenario==='expired'?{consentTimestamp:new Date(Date.now()-181*86400000).toISOString(),lastConsentTimestamp:new Date(Date.now()-181*86400000).toISOString()}:{} )};
  await isolated.addCookies([{name:site.consent.cookieName,value:scenario==='malformed'?'bad-json':encodeURIComponent(JSON.stringify(old)),url:origin,expires:scenario==='expired'?Math.floor(Date.now()/1000)-1:Math.floor(Date.now()/1000)+86400}]);const isolatedPage=await isolated.newPage();const requestCount:number=network.length;await open(isolatedPage);await banner(isolatedPage).waitFor({state:'visible'});assert.equal(network.length,requestCount);await isolated.close();
 }
 results.push('Expired, malformed and old-policy cookies require a new choice and make no provider requests');
 const blocked=await context();await blocked.route(`${collector}/**`,route=>route.abort());const blockedPage=await blocked.newPage();await open(blockedPage);await banner(blockedPage).getByRole('button',{name:site.consent.ui.accept,exact:true}).click();await blockedPage.locator('a[href^="/go/"]').click();await blockedPage.waitForURL(site.qa.phase5.destination);await blocked.close();
 results.push('Blocking both measurement scripts does not block native affiliate navigation');
 const privateContext=await context();await privateContext.addCookies([{name:site.consent.cookieName,value:encodeURIComponent(JSON.stringify(accepted)),url:origin}]);const privatePage=await privateContext.newPage(),privateBefore=network.length;await open(privatePage,'/redaksjon');await open(privatePage,'/unknown-phase5-route');assert.equal(network.length,privateBefore);await privateContext.close();
 results.push('Private editorial and missing pages with existing consent never load analytics');
 assert.deepEqual(external,[]);assert.ok(transport.every(request=>request.consented));
 const measurementContext=await context(),measurementPage=await measurementContext.newPage(),requested=new Map<string,Promise<Buffer>>();
 measurementPage.on('response',response=>{if(response.request().resourceType()==='script'&&new URL(response.url()).origin===origin)requested.set(new URL(response.url()).pathname,response.body());});
 await open(measurementPage);const html=await(await fetch(new URL(path,origin))).text(),$=load(html);
 const files=await Promise.all([...requested].map(async([src,body])=>({src,gzip:gzipSync(await body).length})));await measurementContext.close();
 const inline=$('script:not([src]):not([type="application/ld+json"])').map((_i,el)=>$(el).text()).get().join('\n'),externalGzip=files.reduce((sum,file)=>sum+file.gzip,0),inlineGzip=gzipSync(inline).length;
 await writeFile(`${evidence}/javascript.json`,JSON.stringify({checkedAt:new Date().toISOString(),measurement:'All unique scripts actually requested by a fresh article browser context plus inline JavaScript in raw HTML before consent',files,externalGzip,inlineGzip,total:externalGzip+inlineGzip,finalTemplateBudget:finalTemplateProfile.limits.initialJsGzipBytes,finalTemplateBudgetPassed:externalGzip+inlineGzip<=finalTemplateProfile.limits.initialJsGzipBytes,phase5BudgetException:null,fieldInp:'NOT_MEASURED'},null,2)+'\n');
 await writeFile(`${evidence}/consent.json`,JSON.stringify({checkedAt:new Date().toISOString(),results,audits,network,transport,providers:Object.fromEntries(Object.entries(providers).map(([name,body])=>[name,{sha256:createHash('sha256').update(body).digest('hex'),bytes:body.length}])),testTransport:'Unmodified downloaded Vercel production scripts; local HTTP collector; no production account; webdriver/Headless signal disabled only in test contexts',externalRequests:external},null,2)+'\n');
 console.log(`PASS: ${results.length} consent/network scenarios, four accessibility audits and real Vercel provider payloads.`);
}catch(error){await writeFile('work/phase5-consent-failure.json',JSON.stringify({message:error instanceof Error?error.message:String(error),serverExitCode:server.child.exitCode,serverSignal:server.child.signalCode,browserErrors,network},null,2));throw error;}finally{await browser.close();await server.stop();await close(receiver);await close(destination);}
