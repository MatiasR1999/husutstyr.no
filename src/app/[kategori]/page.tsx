import {notFound} from 'next/navigation';
import {resolvePage} from '@/lib/public-pages';
import {publicMetadata} from '@/lib/seo/page';
import {PublicPageView} from '@/components/public-page';
type Props={params:Promise<{ kategori:string }>};
export const revalidate=600;
export function generateStaticParams(){return [];}
export async function generateMetadata({params}:Props){return publicMetadata(await resolvePage(`/${(await params).kategori}`));}
export default async function Page({params}:Props){
 const page=await resolvePage(`/${(await params).kategori}`);if(!page) notFound();
 return <PublicPageView page={page} />;
}
