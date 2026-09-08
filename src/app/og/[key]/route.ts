import {resolvePage} from '@/lib/public-pages';
import {decodeView} from '@/lib/seo/listing';
import {ogImage} from '@/lib/seo/og';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{key:string}>}) {
 if(new URL(request.url).search) return new Response(null,{status:404});
 const decoded=decodeView((await params).key);
 const page=decoded?await resolvePage(decoded.path,new URLSearchParams(decoded.query.params).toString()):null;
 return page?ogImage(page):new Response(null,{status:404});
}
