import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
import {readFile,rm,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {cpus,release,platform} from 'node:os';
import sharp from 'sharp';
import {load} from 'cheerio';
import site from '../../site.config';
import {networkArticleCachePath} from '../../src/lib/seo/network-cache';
import {startQaServer} from '../qa-server';
import {finalTemplateProfile as profile,percentile75} from '../performance-profile';
const variant=process.env.QA_LAYOUT_VARIANT??'2',evidence=`docs/qa/phase7/variant-${variant}`;
const fixture=JSON.parse(await readFile('work/phase7-fixture.json','utf8')) as {path:string;textCharacters:number};
const cases=[{name:'home',path:'/'},{name:'article',path:`/${site.qa.article.categorySlug}/${site.qa.article.slug}`},{name:'long-image-article',path:fixture.path}];
interface Metrics {lcp:number;cls:number;ttfb:number;consentMs:number;menuMs:number;contentMs:number|null;jsGzipBytes:number;inlineGzipBytes:number}
interface Sample extends Metrics {name:string;mode:'cold'|'warm';sample:number;cacheHeader:string;lcpElement:string}
interface Measurements {lcp:number;cls:number;interactions:number[];lcpElement:string}
declare global {interface Window {__phase7:Measurements}}
const samples:Sample[]=[],files:Record<string,number>={};
await mkdir(evidence,{recursive:true});
process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('work/playwright');
const {chromium}=await import('@playwright/test');
// A deterministic textured image exercises real image decoding and AVIF/WebP delivery, without depicting a fake product.
const width=1600,height=900,pixels=Buffer.alloc(width*height*3);
for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*3;pixels[i]=(x+y)%256;pixels[i+1]=(x*3+y*5)%256;pixels[i+2]=(x^y)%256;}
const jpeg=await sharp(pixels,{raw:{width,height,channels:3}}).jpeg({quality:85}).toBuffer();
const imageOrigin=new URL(site.qa.phase7.imageUrl);
const imageServer=createServer((req,res)=>{if(req.url!==imageOrigin.pathname){res.writeHead(404);res.end();return;}res.setHeader('Content-Type','image/jpeg');res.end(jpeg);});
await new Promise<void>((resolve,reject)=>{imageServer.once('error',reject);imageServer.listen(Number(imageOrigin.port),imageOrigin.hostname,resolve);});
const browser=await chromium.launch(),startedAt=new Date().toISOString();
try {
 for(const scenario of cases)for(let sample=1;sample<=profile.samples;sample++){
  const cachePath=scenario.path==='/'?'/index':networkArticleCachePath('off',scenario.path);
  for(const suffix of ['.html','.rsc','.meta','.segments'])await rm(`.next/server/app${cachePath}${suffix}`,{force:true,recursive:true});
  await rm('.next/cache/fetch-cache',{force:true,recursive:true});
  await rm('.next/cache/images',{force:true,recursive:true});
  const server=await startQaServer(`phase7-performance-${variant}-${scenario.name}-${sample}`);
  try {for(const mode of ['cold','warm'] as const){
   const context=await browser.newContext({viewport:profile.viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1});
   try {
    const page=await context.newPage(),cdp=await context.newCDPSession(page),requested=new Set<string>(),errors:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{if(request.resourceType()==='script')requested.add(request.url());});
    await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:profile.latencyMs,downloadThroughput:profile.downloadBytesPerSecond,uploadThroughput:profile.uploadBytesPerSecond});
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:profile.cpuSlowdown});
    await page.addInitScript(()=>{
     window.__phase7={lcp:0,cls:0,interactions:[],lcpElement:''};
     new PerformanceObserver(list=>{for(const entry of list.getEntries()){const lcp=entry as PerformanceEntry&{element?:Element};window.__phase7.lcp=entry.startTime;window.__phase7.lcpElement=lcp.element?.tagName??'';}}).observe({type:'largest-contentful-paint',buffered:true});
     let start=0,last=0,value=0;
     new PerformanceObserver(list=>{for(const entry of list.getEntries()){const shift=entry as PerformanceEntry&{hadRecentInput:boolean;value:number};if(shift.hadRecentInput)continue;if(entry.startTime-last>=1000||entry.startTime-start>=5000){start=entry.startTime;value=0;}value+=shift.value;last=entry.startTime;window.__phase7.cls=Math.max(window.__phase7.cls,value);}}).observe({type:'layout-shift',buffered:true});
     new PerformanceObserver(list=>{for(const entry of list.getEntries()){const event=entry as PerformanceEventTiming;if(event.interactionId)window.__phase7.interactions.push(event.duration);}}).observe({type:'event',buffered:true,durationThreshold:16});
    });
    const response=await page.goto(new URL(scenario.path,site.qa.identity.url).href,{waitUntil:'networkidle'});
    assert.equal(response?.status(),200);const cache=response!.headers()['x-nextjs-cache'];assert.equal(cache,mode==='cold'?'MISS':'HIT',`${scenario.name} ${mode}`);
    const html=await response!.text(),$=load(html);
    for(const el of $('script[src]:not([nomodule])').toArray())requested.add(new URL($(el).attr('src')!,site.qa.identity.url).href);
    let external=0;
    for(const url of requested){const source=new URL(url);assert.equal(source.origin,site.qa.identity.url,'No provider script before consent');assert.ok(source.pathname.startsWith('/_next/static/'));const size=gzipSync(await readFile(`.next/static/${decodeURIComponent(source.pathname).split('/_next/static/')[1]}`)).length;files[source.pathname]=size;external+=size;}
    const inline=gzipSync($('script:not([src]):not([type="application/ld+json"])').toArray().map(el=>$(el).html()??'').join('\n')).length;
    await page.locator('#cc-main .cm').waitFor({state:'visible'});
    if(sample===1&&mode==='warm')await page.screenshot({path:`${evidence}/${scenario.name}-mobile.png`});
    const interaction=async(action:()=>Promise<unknown>)=>{await page.evaluate(()=>{window.__phase7.interactions=[];});await action();await page.waitForTimeout(150);return page.evaluate(()=>Math.max(0,...window.__phase7.interactions));};
    const consentMs=await interaction(()=>page.getByRole('button',{name:site.consent.ui.reject,exact:true}).click());
    const menuMs=await interaction(()=>page.locator('summary').click());assert.equal(await page.locator('details').getAttribute('open'),'');
    let contentMs:number|null=null;
    if(scenario.path!=='/'){contentMs=await interaction(()=>page.getByRole('link',{name:site.ui.contents,exact:true}).click());assert.equal(new URL(page.url()).hash,`#${site.qa.article.section.id}`);}
    const data=await page.evaluate(()=>({lcp:window.__phase7.lcp,cls:window.__phase7.cls,lcpElement:window.__phase7.lcpElement,ttfb:(performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).responseStart}));
    assert.ok(data.lcp>0);assert.deepEqual(errors,[]);
    if(scenario.name==='long-image-article'){
     assert.ok($('article .article-body').text().length>=fixture.textCharacters);assert.equal($('article figure img').length,2);assert.equal($('link[rel="preload"][as="image"]').length,1);assert.equal($('article figure img').first().attr('loading'),undefined);assert.equal($('article figure img').last().attr('loading'),'lazy');
     for(const el of $('article figure img').toArray()){assert.equal($(el).attr('width'),'1600');assert.equal($(el).attr('height'),'900');assert.ok($(el).attr('sizes'));}
     const first=page.locator('article figure img').first();await first.scrollIntoViewIfNeeded();await first.evaluate(async el=>{await (el as HTMLImageElement).decode();});
     const image=await first.evaluate(el=>({url:(el as HTMLImageElement).currentSrc,width:(el as HTMLImageElement).naturalWidth}));assert.ok(image.width>0);
     const served=await page.request.get(image.url,{headers:{Accept:'image/avif,image/webp'}});assert.equal(served.status(),200);assert.match(served.headers()['content-type']??'',/image\/(avif|webp)/);
    }
    samples.push({name:scenario.name,mode,sample,cacheHeader:cache!,...data,consentMs,menuMs,contentMs,jsGzipBytes:external+inline,inlineGzipBytes:inline});
    await writeFile(`${evidence}/performance-progress.json`,JSON.stringify({startedAt,complete:false,samples},null,2)+'\n');
    console.log(`MEASURED: variant=${variant} case=${scenario.name} cache=${mode} sample=${sample}`);
   }finally{await context.close();}
  }}finally{await server.stop();}
 }
}finally{await browser.close();await new Promise<void>(resolve=>imageServer.close(()=>resolve()));}
const groups=cases.flatMap(scenario=>(['cold','warm'] as const).map(mode=>{
 const data=samples.filter(row=>row.name===scenario.name&&row.mode===mode);
 return {name:scenario.name,mode,samples:data.length,lcpMs:percentile75(data.map(x=>x.lcp)),cls:percentile75(data.map(x=>x.cls)),ttfbMs:percentile75(data.map(x=>x.ttfb)),consentMs:percentile75(data.map(x=>x.consentMs)),menuMs:percentile75(data.map(x=>x.menuMs)),contentMs:scenario.path==='/'?null:percentile75(data.map(x=>x.contentMs!)),jsGzipBytes:Math.max(...data.map(x=>x.jsGzipBytes))};
}));
const failures=groups.flatMap(g=>Object.entries({LCP:g.lcpMs>profile.limits.lcpMs,CLS:g.cls>profile.limits.cls,TTFB:g.ttfbMs>profile.limits.ttfbMs,INTERACTION:Math.max(g.consentMs,g.menuMs,g.contentMs??0)>profile.limits.interactionMs,JS:g.jsGzipBytes>profile.limits.initialJsGzipBytes}).filter(([,failed])=>failed).map(([budget])=>`${g.name}:${g.mode}:${budget}`));
await writeFile(`${evidence}/performance.json`,JSON.stringify({startedAt,checkedAt:new Date().toISOString(),variant,profile,chromium:browser.version(),runner:{node:process.version,platform:platform(),release:release(),cpu:cpus()[0]?.model},fixture,imageBytes:jpeg.length,groups,samples,files,failures,status:failures.length?'BLOCKED':'PASS',fieldINP:'NOT_RUN',fieldCWV:'NOT_RUN',method:'Nearest-rank p75, five cold/warm pairs, fresh context and disabled browser cache every visit; generated route, data and image caches removed before cold server process. Initial scripts include runtime and inline; unsupported nomodule excluded. Refusal measured; grant/withdrawal covered by real-provider regression. Event timing below 16 ms reports 0, not exact zero. Synthetic image is not a real editorial photo.'},null,2)+'\n');
if(failures.length){console.error(`BLOCKED: ${failures.join(', ')}`);process.exitCode=1;}else console.log('PASS: Final-template lab budgets.');
