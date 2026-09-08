import {getArticles,getCategory} from '@/lib/content';
import {readRuntimeConfig} from '@/lib/config';
import {rssFeed,xmlHeaders} from '@/lib/seo/feeds';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{kategori:string}>}) {const {kategori}=await params;const category=await getCategory(kategori);if(!category) return new Response(null,{status:404,headers:xmlHeaders});return new Response(rssFeed(readRuntimeConfig(process.env),category,await getArticles(kategori)),{headers:{...xmlHeaders,'Content-Type':'application/rss+xml; charset=utf-8'}});}
