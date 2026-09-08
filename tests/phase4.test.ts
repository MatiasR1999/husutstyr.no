import {describe,it,expect,vi} from 'vitest';
import site from '../site.config';
import {readRuntimeConfig} from '../src/lib/config';
import {pageMetadata} from '../src/lib/seo/metadata';
import {parsePageQuery,listingSlice,encodeView,decodeView} from '../src/lib/seo/listing';
import {buildArticleGraph,graphSchema} from '../src/lib/seo/json-ld';
import {currentPrice,parseContent,reviewSnapshotSchema} from '../src/lib/domain/content';
const runtime={...readRuntimeConfig({SEO_QA_MODE:'true'}),qa:false};
describe('listing policy',()=>{
 it.each(['page=0','page=-1','page=01','page=2&page=3','page=x','page=9007199254740993','sort=bad','topic=..','title=draft'])('rejects malformed parameters %s',search=>expect(parsePageQuery(new URLSearchParams(search))).toBeNull());
 it('serves twenty items and rejects nonexistent pages',()=>{const data=Array.from({length:21},(_,i)=>i);expect(listingSlice(data,1)?.items).toHaveLength(20);expect(listingSlice(data,2)?.items).toEqual([20]);expect(listingSlice(data,3)).toBeNull();});
 it('indexes pagination with separate canonical and editorial metadata',()=>{const meta=pageMetadata(runtime,'/kontroll',site.qa.category,{params:{page:'2'}});expect(meta.robots).toEqual({index:true,follow:true});expect(meta.alternates?.canonical).toBe(`${runtime.identity.url}/kontroll?page=2`);});
 it('distinguishes four and five published articles and overrides facets',()=>{for(const count of [4,5]){const belowThreshold=count<site.minTopicArticles;expect(pageMetadata(runtime,'/emne/qa',site.qa.category,{belowThreshold}).robots).toEqual({index:count>=5,follow:true});for(const sort of ['newest','oldest']){const query=parsePageQuery(new URLSearchParams({sort,page:'2'}))!;const meta=pageMetadata(runtime,'/emne/qa',site.qa.category,{belowThreshold,facet:query.facet,params:query.params});expect(meta.robots).toEqual({index:false,follow:true});expect(meta.alternates?.canonical).toBe(`${runtime.identity.url}/emne/qa?page=2&sort=${sort}`);}}});
 it('round trips only public paths and rejects OG title injection',()=>{expect(decodeView(encodeView('/kontroll',{page:'2',sort:'oldest'}))?.query.page).toBe(2);expect(decodeView(Buffer.from('//evil').toString('base64url'))).toBeNull();});
});
describe('review qualification and expiry',()=>{
 const now=Date.parse('2026-09-07T12:00:00.000Z');
 const product=reviewSnapshotSchema.parse({id:crypto.randomUUID(),name:site.qa.phase4.product,manufacturer:null,identifier:null,owned:false,price:{amount:'123.45',currency:'NOK',source:site.qa.markers.source,checkedAt:'2026-09-07T11:00:00.000Z',validUntil:'2026-09-08T11:00:00.000Z'}});
 const payload=parseContent({version:1,kind:'review',title:site.qa.article.title,summary:site.qa.article.summary,section:site.qa.article.section,seo:site.qa.article.seo,blocks:site.qa.article.body.map(text=>({type:'paragraph',text})),sources:[],research:[],topicIds:[],review:{productId:product.id,rating:4,paid:false,method:site.qa.markers.research}});
 const article={...site.qa.article,kind:'review' as const,categorySlug:'anmeldelser',pillarSlug:site.qa.category.slug,payload,reviewSnapshot:product};
 it('emits valid Product, Review and a documented Rating only when eligible',()=>{const graph=buildArticleGraph(runtime,article,now);expect(graph['@graph'].some(node=>node['@type']==='Review')).toBe(true);expect(graphSchema.safeParse(graph).success).toBe(true);});
 it.each(['owned','paid','missing','expired'])('omits Review/Rating for %s',mode=>{const snapshot={...product,owned:mode==='owned',price:mode==='missing'?null:product.price};const content=parseContent({...payload,review:{...(payload.kind==='review'?payload.review:{}),paid:mode==='paid'}});const graph=buildArticleGraph(runtime,{...article,payload:content,reviewSnapshot:snapshot},mode==='expired'?now+86400000:now);expect(JSON.stringify(graph)).not.toMatch(/"(?:Review|Rating|AggregateRating)"/);if(['missing','expired'].includes(mode))expect(JSON.stringify(graph)).not.toContain('"Product"');});
 it('rejects future, expired and overly long-lived prices',()=>{expect(currentPrice(product,now)).not.toBeNull();expect(currentPrice(product,now-7200000)).toBeNull();expect(currentPrice(product,now+86400000)).toBeNull();});
 it('rejects fabricated rich-result types and out-of-range ratings',()=>{const graph=buildArticleGraph(runtime,article,now);for(const type of ['FAQPage','VehicleListing','CourseInfo','ClaimReview','EstimatedSalary','BookActions','LearningVideo','SpecialAnnouncement','PracticeProblem'])expect(graphSchema.safeParse({...graph,'@graph':[{'@type':type,'@id':runtime.identity.url}]}).success).toBe(false);expect(()=>parseContent({...payload,review:{productId:product.id,rating:6,paid:false,method:site.qa.markers.research}})).toThrow();});
});

describe('publication delivery across pagination',()=>{
 it('finds a published article on page two and checks its real OG endpoint',async()=>{
  const {verifyDelivery}=await import('../src/lib/seo/delivery-verification');
  const path='/kontroll/only-on-page-two',hash='a'.repeat(64),seen:string[]=[];
  const transport:typeof fetch=async input=>{const url=new URL(String(input)),route=url.pathname+url.search;seen.push(route);
   if(route===path)return new Response(`<article data-publication-hash="${hash}"></article>`);
   if(route==='/kontroll')return new Response('<a href="/kontroll?page=2">2</a>');
   if(route==='/kontroll?page=2')return new Response(`<a href="${path}">Article</a>`);
   if(route==='/kontroll/rss.xml')return new Response(`<link>${runtime.identity.url}${path}</link>`);
   if(route==='/sitemap.xml')return new Response('<sitemapindex></sitemapindex>');
   if(route===`/og/${encodeView(path)}`)return new Response(null,{headers:{'x-publication-hash':hash}});
   throw new Error(`Unexpected request ${route}`);
  };
  await verifyDelivery({...runtime,qa:true},{event_id:crypto.randomUUID(),snapshot:{articleId:crypto.randomUUID(),siteId:site.id,locale:'nb',isTest:true,path,namespace:'kontroll',revisionId:crypto.randomUUID(),contentHash:hash,authors:[],topics:[],operation:'publish',changed:true},cache_state:'pending',notification_state:'skipped',attempts:1,last_error:null},transport);
  expect(seen).toContain('/kontroll?page=2');expect(seen).toContain(`/og/${encodeView(path)}`);
 });
});


describe('safe Neon connection retry',()=>{
 it('retries a connect timeout once before any request was sent',async()=>{
  const {fetchWithConnectionRetry}=await import('../src/lib/db/transport');
  const transport=vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError('fetch failed',{cause:{code:'UND_ERR_CONNECT_TIMEOUT'}})).mockResolvedValue(new Response('ok'));
  expect((await fetchWithConnectionRetry(site.qa.markers.source,{method:'POST',body:'query'},transport)).status).toBe(200);expect(transport).toHaveBeenCalledTimes(2);
 });
 it('does not retry unknown write outcomes, HTTP failures or a second connect timeout',async()=>{
  const {fetchWithConnectionRetry}=await import('../src/lib/db/transport');
  const unknown=vi.fn<typeof fetch>().mockRejectedValue(new TypeError('fetch failed',{cause:{code:'UND_ERR_SOCKET'}}));await expect(fetchWithConnectionRetry(site.qa.markers.source,{},unknown)).rejects.toThrow();expect(unknown).toHaveBeenCalledTimes(1);
  const http=vi.fn<typeof fetch>().mockResolvedValue(new Response(null,{status:503}));expect((await fetchWithConnectionRetry(site.qa.markers.source,{},http)).status).toBe(503);expect(http).toHaveBeenCalledTimes(1);
  const timeout=vi.fn<typeof fetch>().mockRejectedValue(new TypeError('fetch failed',{cause:{code:'UND_ERR_CONNECT_TIMEOUT'}}));await expect(fetchWithConnectionRetry(site.qa.markers.source,{},timeout)).rejects.toThrow();expect(timeout).toHaveBeenCalledTimes(2);
 });
});
