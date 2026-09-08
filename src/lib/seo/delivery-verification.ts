import type {RuntimeConfig} from '@/lib/config';
import type {PublicationJob} from '@/lib/editorial/publication';
import {encodeView} from './listing';
import {canonicalUrl} from './urls';
export async function verifyDelivery(runtime:RuntimeConfig,job:PublicationJob,transport:typeof fetch=fetch) {
 const snapshot=job.snapshot,visible=snapshot.operation==='publish',path=snapshot.path;
 const get=async(route:string)=>{const [pathname,search]=route.split('?');const response=await transport(canonicalUrl(runtime.identity.url,pathname!,Object.fromEntries(new URLSearchParams(search))),{cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(10000)});return {status:response.status,body:await response.text()};};
 const article=await get(path);
 if(visible){if(article.status!==200||!article.body.includes(`data-publication-hash="${snapshot.contentHash}"`)) throw new Error('public_revision_not_visible');}
 else if(article.status!==410) throw new Error('withdrawal_not_visible');
 if(snapshot.namespace==='_pages') {
  const home=await get('/');if(home.status!==200||home.body.includes(`href="${path}"`)!==visible) throw new Error('trust_navigation_not_updated');
 } else {
  const aggregate=await get(`/${snapshot.namespace}`);
  if(aggregate.status!==200&&!(aggregate.status===404&&!visible)) throw new Error('aggregate_unavailable');
  let found=aggregate.body.includes(`href="${path}"`);
  const pages=new Set([...aggregate.body.matchAll(/href="([^"<>]*\?page=\d+)"/g)].map(match=>match[1]!));
  for(const route of pages){const response=await get(route.replaceAll('&amp;','&'));if(response.status!==200) throw new Error('pagination_unavailable');found ||= response.body.includes(`href="${path}"`);}
  if(found!==visible) throw new Error('aggregate_not_updated');
  const rss=await get(`/${snapshot.namespace}/rss.xml`);
  if(rss.status!==200&&!(rss.status===404&&!visible)) throw new Error('feed_unavailable');
  if(rss.body.includes(`<link>${canonicalUrl(runtime.identity.url,path)}</link>`)!==visible) throw new Error('feed_not_updated');
 }
 const index=await get('/sitemap.xml');if(index.status!==200) throw new Error('sitemap_unavailable');
 const expected=visible&&!runtime.qa&&!runtime.preview;let found=false;
 for(const match of index.body.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  const url=new URL(match[1]!.replaceAll('&amp;','&'));if(url.origin!==new URL(runtime.identity.url).origin) throw new Error('invalid_sitemap_origin');
  const response=await transport(url,{cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(10000)});if(response.status!==200) throw new Error('sitemap_changed_during_verification');
  if((await response.text()).includes(`<loc>${canonicalUrl(runtime.identity.url,path)}</loc>`)) found=true;
 }
 if(found!==expected) throw new Error('sitemap_not_updated');
 const publishedImage=await transport(canonicalUrl(runtime.identity.url,`/og/${encodeView(path)}`),{cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(10000)});
 if(visible?(publishedImage.status!==200||publishedImage.headers.get('x-publication-hash')!==snapshot.contentHash):![404,410].includes(publishedImage.status)) throw new Error('image_revision_not_updated');
 await publishedImage.arrayBuffer();
 if(!visible){const image=await get(`${path}/opengraph-image`);if(![404,410].includes(image.status)) throw new Error('withdrawn_image_visible');}
}
