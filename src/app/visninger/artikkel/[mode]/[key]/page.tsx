import {cache} from 'react';
import {notFound} from 'next/navigation';
import {resolvePage} from '@/lib/public-pages';
import {decodeView} from '@/lib/seo/listing';
import {publicMetadata} from '@/lib/seo/page';
import {networkCacheMode} from '@/lib/network/config';
import {PublicPageView} from '@/components/public-page';
type Props={params:Promise<{mode:string;key:string}>};
export const revalidate=3600;
export function generateStaticParams(){return [];}
const read=cache(async(mode:string,key:string)=>{
 if(mode!==networkCacheMode())return null;
 const decoded=decodeView(key);if(!decoded)return null;
 const page=await resolvePage(decoded.path,new URLSearchParams(decoded.query.params).toString());
 return page?.type==='article'&&page.article.kind!=='review'?page:null;
});
export async function generateMetadata({params}:Props){const {mode,key}=await params;return publicMetadata(await read(mode,key));}
export default async function Page({params}:Props){const {mode,key}=await params,page=await read(mode,key);if(!page)notFound();return <PublicPageView page={page}/>;}
