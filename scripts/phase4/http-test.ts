import {neon} from '@neondatabase/serverless';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {gzipSync} from 'node:zlib';
import {load} from 'cheerio';
import AxeBuilder from '@axe-core/playwright';
import site from '../../site.config';
import {graphSchema} from '../../src/lib/seo/json-ld';
import {validateSeoCopy} from '../../src/lib/seo/metadata';
import {startQaServer} from '../qa-server';
import budgetPolicy from './budget-policy.json';
const exec=promisify(execFile),origin=site.qa.identity.url,variant=process.env.QA_LAYOUT_VARIANT??'2';
const evidence=`${process.env.QA_EVIDENCE_DIR??"docs/qa/phase4"}/variant-${variant}`;await mkdir(evidence,{recursive:true});
const fixture=JSON.parse(await readFile('work/phase4-fixture.json','utf8')) as {records:{path:string;kind:string}[]};
const server=await startQaServer(`phase4-${variant}`);
const responses=new Map<string,{html:string;status:number;headers:string}>();let requestId=0;
async function curl(path:string) {
 const filename=`${evidence}/response-${++requestId}`;
 const args=['-sS','--max-time','45','-D',`${filename}.headers.txt`,'-o',`${filename}.html`,'-w','%{http_code}',new URL(path,origin).href];
 const result=await exec('curl',args,{maxBuffer:2000000});
 const response={html:await readFile(`${filename}.html`,'utf8'),status:Number(result.stdout),headers:await readFile(`${filename}.headers.txt`,'utf8')};responses.set(path,response);return response;
}
const requestedScripts=new Set<string>();
const report:Record<string,unknown>={checkedAt:new Date().toISOString(),variant};
try {
 const seenTitles=new Set<string>(),seenDescriptions=new Set<string>();
 const depths=new Map<string,number>([['/',0]]),queue=['/'];
 while(queue.length){const path=queue.shift()!,depth=depths.get(path)!;const response=await curl(path);assert.equal(response.status,200,path);
  const $=load(response.html);assert.equal($('h1').length,1,path);assert.equal($('main').length,1);assert.equal($('title').length,1);assert.equal($('meta[name="description"]').length,1);assert.equal($('link[rel="canonical"]').length,1);assert.equal($('link[rel="canonical"]').attr('href'),new URL(path,origin).href,path);validateSeoCopy({title:$('title').text(),description:$('meta[name="description"]').attr('content')!});
  assert.equal($('link[hreflang="nb"]').attr('href'),new URL(path,origin).href);assert.equal($('link[hreflang="x-default"]').attr('href'),new URL(path,origin).href);
  assert.match($('meta[name="robots"]').attr('content')??'',/noindex/);assert.match(response.headers,/x-robots-tag: noindex/i);
  assert.ok(!seenTitles.has($('title').text()),`Duplicate title: ${path}`);seenTitles.add($('title').text());const description=$('meta[name="description"]').attr('content')!;assert.ok(!seenDescriptions.has(description),`Duplicate description: ${path}`);seenDescriptions.add(description);
  graphSchema.parse(JSON.parse($('script[type="application/ld+json"]').text()));
  if(path!=='/')assert.ok($('nav[aria-label]').filter((_,el)=>$(el).attr('aria-label')===site.ui.breadcrumb).length);
  if(depth>=3)continue;
  for(const el of $('a[href]').toArray()){const href=$(el).attr('href')!;if(!href.startsWith('/')||href.startsWith('//')||href.includes('#')||/\.(xml|txt)$/.test(href)||/^\/(api|go|redaksjon|og|visninger)(\/|$)/.test(href))continue;if(!depths.has(href)){depths.set(href,depth+1);queue.push(href);}}
 }
 const published=await neon(process.env.DATABASE_URL!)`select namespace,slug,kind from editorial.published_articles where site_id=${site.id} and locale=${site.locale} and is_test=true and kind<>'page'`;
 const required=published.map(row=>`/${row.namespace}/${row.slug}`);
 assert.ok(fixture.records.filter(row=>row.kind!=='page').every(row=>required.includes(row.path)));
 const mainPath=`/${site.qa.category.slug}/${site.qa.article.slug}`;
 for(const row of published){const path=`/${row.namespace}/${row.slug}`;assert.ok(depths.has(path),`Not discovered: ${path}`);assert.ok(depths.get(path)!<=3);const $=load(responses.get(path)!.html);assert.equal($('[data-pillar]').attr('href'),`/${site.qa.category.slug}`);const graph=graphSchema.parse(JSON.parse($('script[type="application/ld+json"]').text()));assert.ok(graph['@graph'].some(node=>node['@type']===(row.kind==='news'?'NewsArticle':'Article')),`Wrong article type: ${path}`);}
 report.crawl={pages:responses.size,articles:required.length,maxDepth:Math.max(...required.map(path=>depths.get(path)!)),depths:Object.fromEntries(depths)};
 const category=`/${site.qa.category.slug}`,first=load(responses.get(category)!.html),secondResponse=await curl(`${category}?page=2`),second=load(secondResponse.html);
 assert.equal(secondResponse.status,200);assert.equal(first('ul.article-list > li').length,20);assert.ok(second('ul.article-list > li').length>0);assert.notEqual(first('title').text(),second('title').text());assert.notEqual(first('meta[name="description"]').attr('content'),second('meta[name="description"]').attr('content'));assert.equal(second('link[rel="next"],link[rel="prev"]').length,0);
 report.pagination='PASS: separate registered copy and canonical; normal indexability covered by policy tests; local QA remains noindex';
 for(const search of ['page=0','page=-1','page=x','page=99','page=2&page=3','sort=bad']) assert.equal((await curl(`${category}?${search}`)).status,404,search);
 for(const search of ['sort=newest','sort=oldest','topic=qa-four','page=2&sort=oldest']){const response=await curl(`${category}?${search}`);assert.equal(response.status,200,search);const $=load(response.html);assert.match($('meta[name="robots"]').attr('content')??'',/noindex/);assert.equal($('link[rel="canonical"]').attr('href'),`${origin}${category}?${search}`);}
 for(const [slug,count] of [['qa-four',4],['qa-five',5]] as const){const response=responses.get(`/emne/${slug}`)??await curl(`/emne/${slug}`);assert.equal(load(response.html)('ul.article-list > li').length,count);}
 report.topics='PASS: four/five actual published entries; threshold policy tested independently of mandatory QA noindex';
 for(const mode of ['eligible','owned','paid','missing','expired']){const response=responses.get(`/anmeldelser/qa-phase4-${mode}`)!;const $=load(response.html),graph=JSON.parse($('script[type="application/ld+json"]').text());assert.equal(JSON.stringify(graph).includes('"Review"'),mode==='eligible');assert.equal(JSON.stringify(graph).includes('"Product"'),!['missing','expired'].includes(mode));assert.equal($('[data-price]').length,['missing','expired'].includes(mode)?0:1);assert.equal($('[data-rating]').text().includes('4 / 5'),true);}
 assert.equal((await curl(`/${site.qa.category.slug}/qa-phase4-eligible`)).status,404);
 const imagePaths=['/',category,`${category}?page=2`,`/forfatter/${site.qa.article.author.slug}`,'/emne/qa-five','/om-oss',`${category}/qa-phase4-24`,`${category}/qa-phase4-news`,'/anmeldelser/qa-phase4-eligible'];
 const images=[];
 for(const [i,path] of imagePaths.entries()){
  const response=responses.get(path)??await curl(path),$=load(response.html),imageUrl=$('meta[property="og:image"]').attr('content');assert.ok(imageUrl,path);
  const image=await fetch(imageUrl);assert.equal(image.status,200,path);assert.match(image.headers.get('content-type')??'',/image\/png/);const bytes=Buffer.from(await image.arrayBuffer());assert.equal(bytes.readUInt32BE(16),1200);assert.equal(bytes.readUInt32BE(20),630);
  assert.equal(decodeURIComponent(image.headers.get('x-content-title')??''),$('h1').text().split(' · ')[0]);
  if($('[data-publication-hash]').length)assert.equal(image.headers.get('x-publication-hash'),$('[data-publication-hash]').attr('data-publication-hash'));
  await writeFile(`${evidence}/og-${i}.png`,bytes);images.push({path,url:imageUrl,bytes:bytes.length,title:$('h1').text()});
  assert.equal((await fetch(`${imageUrl}?title=${encodeURIComponent(site.qa.markers.draft)}`)).status,404);
 }
 report.images=images;
 assert.equal((await curl('/visninger/Lw')).status,404);
 process.env.PLAYWRIGHT_BROWSERS_PATH=resolve('work/playwright');
 const {chromium}=await import('@playwright/test');
 const browser=await chromium.launch({headless:true});const accessibility=[];
 try {
  for(const viewport of [{width:390,height:844},{width:1440,height:1000}])for(const path of ['/',`/${site.qa.category.slug}/${site.qa.article.slug}`]){
   const context=await browser.newContext({viewport}),page=await context.newPage();
   if(path!=='/')page.on('request',request=>{if(request.resourceType()==='script')requestedScripts.add(new URL(request.url()).pathname);});
   await page.goto(new URL(path,origin).href,{waitUntil:'networkidle'});
   assert.equal(await page.locator('h1').count(),1);assert.ok(await page.evaluate(()=>getComputedStyle(document.querySelector('h1')!).fontFamily!==getComputedStyle(document.body).fontFamily),'Configured font pair must be applied');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`Overflow ${path} ${viewport.width}`);
   const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(audit.violations,[],`${path} accessibility`);
   await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').getAttribute('href'),'#main-content');
   await page.locator('summary').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('details').getAttribute('open'),'');
   await page.screenshot({path:`${evidence}/${path==='/'?'home':'article'}-${viewport.width}.png`,fullPage:true});
   accessibility.push({path,viewport,violations:audit.violations.length,layout:await page.locator('[data-layout]').getAttribute('data-layout')});await context.close();
  }
 } finally {await browser.close();}
 report.accessibility=accessibility;
 const article=load(responses.get(mainPath)!.html),sources=[...new Set([...article('script[src]:not([nomodule])').toArray().map(el=>article(el).attr('src')!),...requestedScripts])];let js=0;
 for(const source of sources)js+=gzipSync(await readFile(`.next/static/${decodeURIComponent(source).split('/_next/static/')[1]}`)).length;
 const inline=gzipSync(article('script:not([src]):not([type="application/ld+json"])').toArray().map(el=>article(el).html()).join('\n')).length;
 report.javascript={externalGzip:js,inlineGzip:inline,total:js+inline,requestedScripts:[...requestedScripts],phase4Budget:budgetPolicy.phase4GzipBytes,finalTemplateBudget:budgetPolicy.finalTemplateGzipBytes,budgetPassed:js+inline<=budgetPolicy.phase4GzipBytes,finalTemplateBudgetPassed:js+inline<=budgetPolicy.finalTemplateGzipBytes};
 await writeFile(`${evidence}/report.json`,JSON.stringify(report,null,2).replace(/[^\x00-\x7F]/g,char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0'))+'\n');
 console.log(`PASS: variant ${variant}, ${required.length} articles within three clicks, pagination/facets, nine OG responses and four accessibility checks.`);
} finally {await server.stop();}
