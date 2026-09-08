import {publishedAffiliateLinks} from '@/lib/affiliate';
import {affiliateHeaders} from '@/lib/seo/affiliate';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}) {
 if(new URL(request.url).search)return new Response(null,{status:404,headers:affiliateHeaders});
 const {slug}=await params;
 const link=(await publishedAffiliateLinks()).find(link=>link.slug===slug);
 return new Response(null,{status:link?302:404,headers:{...affiliateHeaders,...(link?{Location:link.destination}:{})}});
}
