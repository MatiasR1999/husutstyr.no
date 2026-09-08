import {readRuntimeConfig} from '@/lib/config';
import {sitemapEntries} from '@/lib/public-data';
import {sitemapBundle,xmlHeaders} from '@/lib/seo/feeds';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
 const runtime=readRuntimeConfig(process.env),bundle=sitemapBundle(runtime,runtime.qa||runtime.preview?[]:await sitemapEntries());
 const query=new URL(request.url).searchParams;
 if([...query.keys()].some(key=>key!=='segment')) return new Response(null,{status:400});
 const segment=query.get('segment');if(!segment) return new Response(bundle.index,{headers:xmlHeaders});
 const match=/^([a-f0-9]{64})\.(0|[1-9]\d*)$/.exec(segment);
 if(!match||match[1]!==bundle.version) return new Response(null,{status:404,headers:xmlHeaders});
 const content=bundle.segments[Number(match[2])];return new Response(content??null,{status:content?200:404,headers:xmlHeaders});
}
