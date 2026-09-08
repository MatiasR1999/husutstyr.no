import {notFound} from 'next/navigation';
import {resolvePage} from '@/lib/public-pages';
import {publicMetadata} from '@/lib/seo/page';
import {PublicPageView} from '@/components/public-page';
export const revalidate=600;
export async function generateMetadata(){return publicMetadata(await resolvePage('/'));}
export default async function Page(){
 const page=await resolvePage('/');if(!page) notFound();
 return <PublicPageView page={page} />;
}
