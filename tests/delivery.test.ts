import {describe,it,expect,vi} from 'vitest';
import {load} from 'cheerio';
import site from '../site.config';
import {readRuntimeConfig} from '../src/lib/config';
import {sitemapBundle,robotsText,xmlEscape,rssFeed} from '../src/lib/seo/feeds';
import {notifyIndexNow} from '../src/lib/seo/indexnow';
import {redirectInput} from '../src/lib/seo/redirects';
const qa=readRuntimeConfig({SEO_QA_MODE:'true'}),publicConfig={...qa,qa:false,identity:{...qa.identity,url:new URL(site.qa.markers.source).origin}};
describe('sitemap and feeds',()=>{
 it('splits 45001 URLs stably without duplicates or omissions',()=>{
  const entries=Array.from({length:45001},(_,i)=>({path:`/kontroll/item-${i}`,lastmod:site.qa.article.modifiedAt}));
  const bundle=sitemapBundle(publicConfig,entries);
  expect(bundle.segments.map(xml=>load(xml,{xml:true})('url').length)).toEqual([45000,1]);
  const urls=bundle.segments.flatMap(xml=>load(xml,{xml:true})('url > loc').toArray().map(element=>load(element,{xml:true}).text()));
  expect(new Set(urls).size).toBe(45001);expect(bundle.version).toBe(sitemapBundle(publicConfig,entries.reverse()).version);
  expect(load(bundle.index,{xml:true})('sitemap').length).toBe(2);
 });
 it('applies the uncompressed byte limit and rejects duplicate paths',()=>{
  const entries=Array.from({length:10},(_,i)=>({path:`/kontroll/item-${i}`,lastmod:site.qa.article.modifiedAt}));
  const bundle=sitemapBundle(publicConfig,entries,{urls:45000,bytes:512});
  expect(bundle.segments.every(segment=>Buffer.byteLength(segment)<=512)).toBe(true);expect(bundle.segments.length).toBeGreaterThan(1);
  expect(()=>sitemapBundle(publicConfig,[entries[0]!,entries[0]!])).toThrow();
 });
 it('excludes noindex QA and preview URLs',()=>{const entries=[{path:'/kontroll/item',lastmod:site.qa.article.modifiedAt}];expect(sitemapBundle(qa,entries).count).toBe(0);expect(sitemapBundle({...publicConfig,preview:true},entries).count).toBe(0);expect(robotsText(qa)).toContain('Disallow: /\n');expect(robotsText(publicConfig)).toContain('Disallow: /api/');});
 it('escapes XML and keeps RSS identifiers stable across revisions',()=>{
  expect(xmlEscape('<x a="b">&')).toBe('&lt;x a=&quot;b&quot;&gt;&amp;');
  const article={...site.qa.article,id:crypto.randomUUID(),revisionId:crypto.randomUUID(),contentHash:'a'.repeat(64),categoryName:site.qa.category.name,kind:'article' as const,blocks:[],summary:'</description><item>injected</item>'};
  const category={...site.qa.category,introduction:site.content.category},xml=rssFeed(qa,category,[article]);
  expect(load(xml,{xml:true})('item').length).toBe(1);expect(load(xml,{xml:true})('guid').text()).toBe(load(rssFeed(qa,category,[{...article,revisionId:crypto.randomUUID()}]),{xml:true})('guid').text());
 });
});
describe('IndexNow without external requests',()=>{
 const key='a'.repeat(64),path='/kontroll/item';
 for(const status of [200,202,400,403,422,429,500,503]) it(`handles HTTP ${status}`,async()=>{const transport=vi.fn<typeof fetch>().mockResolvedValue(new Response(null,{status,headers:{'Retry-After':'120'}}));const result=await notifyIndexNow(publicConfig,path,{key,published:true,isTest:false,transport});expect(result.state).toBe([200,202].includes(status)?'sent':status===429||status>=500?'pending':'rejected');if(result.state==='pending') expect(result.delay).toBe(120);expect(transport).toHaveBeenCalledTimes(1);});
 it('retries transport failure and never sends local, preview or draft URLs',async()=>{const transport=vi.fn<typeof fetch>().mockRejectedValue(new Error('offline'));expect((await notifyIndexNow(publicConfig,path,{key,published:true,isTest:false,transport})).state).toBe('pending');transport.mockClear();for(const config of [qa,{...publicConfig,preview:true}]) expect((await notifyIndexNow(config,path,{key,published:true,isTest:false,transport})).state).toBe('skipped');expect((await notifyIndexNow(publicConfig,path,{key,published:false,isTest:false,transport})).state).toBe('skipped');expect(transport).not.toHaveBeenCalled();});
 it('holds notifications until a key is configured',async()=>{const transport=vi.fn<typeof fetch>();expect((await notifyIndexNow(publicConfig,path,{published:true,isTest:false,transport})).state).toBe('pending');expect(transport).not.toHaveBeenCalled();});
});
it('rejects external redirects, private paths and malformed tombstones',()=>{expect(()=>redirectInput.parse({source:'/old',destination:'https://example.com',status:301})).toThrow();expect(()=>redirectInput.parse({source:'/api/secret',destination:'/target',status:301})).toThrow();expect(()=>redirectInput.parse({source:'/old',destination:'/target',status:410})).toThrow();});
