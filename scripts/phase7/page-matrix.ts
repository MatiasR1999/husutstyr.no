import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import site from '../../site.config';
import {graphSchema} from '../../src/lib/seo/json-ld';
const cases=[
 {type:'home',path:'/',schema:'WebSite'},
 {type:'article',path:`/${site.qa.article.categorySlug}/${site.qa.article.slug}`,schema:'Article'},
 {type:'news',path:`/${site.qa.category.slug}/qa-phase4-news`,schema:'NewsArticle'},
 {type:'review',path:'/anmeldelser/qa-phase4-eligible',schema:'Review'},
 {type:'category',path:`/${site.qa.category.slug}`,schema:'BreadcrumbList'},
 {type:'topic',path:'/emne/qa-five',schema:'BreadcrumbList'},
 {type:'author',path:`/forfatter/${site.qa.article.author.slug}`,schema:'Person'},
 {type:'trust',path:`/${site.trustPages[0]!.slug}`,schema:'BreadcrumbList'},
];
const rows=[];
for(const variant of [1,2,3]){
 const directory=`docs/qa/phase7/variant-${variant}`,captured=new Map<string,{file:string;html:string}>();
 for(const file of (await readdir(directory)).filter(file=>/^response-\d+\.html$/.test(file))){const html=await readFile(`${directory}/${file}`,'utf8'),$=load(html),canonical=$('link[rel="canonical"]').attr('href');if(canonical)captured.set(canonical,{file:`${directory}/${file}`,html});}
 for(const scenario of cases){
  const canonical=new URL(scenario.path,site.qa.identity.url).href,response=captured.get(canonical);assert.ok(response,canonical);
  const headers=await readFile(response.file.replace('.html','.headers.txt'),'utf8');assert.match(headers,/^HTTP\/1\.1 200 /m);
  const $=load(response.html);assert.equal($('head title').length,1);assert.equal($('meta[name="description"]').length,1);assert.equal($('link[rel="canonical"]').length,1);
  const graph=graphSchema.parse(JSON.parse($('script[type="application/ld+json"]').text()));assert.ok(graph['@graph'].some(node=>node['@type']===scenario.schema));
  const main=$('main').clone();main.find('script,template,[hidden]').remove();assert.ok(main.text().trim().length>0);
  rows.push({variant,...scenario,html:response.file,sha256:createHash('sha256').update(response.html).digest('hex'),httpStatus:200,titleCount:1,descriptionCount:1,canonicalCount:1,graphTypes:graph['@graph'].map(node=>node['@type']),visibleMainCharacters:main.text().length,status:'PASS'});
 }
}
await writeFile('docs/qa/phase7/page-type-matrix.json',JSON.stringify({checkedAt:new Date().toISOString(),cases:rows.length,rows,method:'Assertions against captured curl response bodies and matching HTTP headers; schema assertions inspect parsed JSON-LD from those responses'},null,2)+'\n');
console.log(`PASS: ${rows.length} captured page-type/layout responses have correct metadata and JSON-LD types.`);
