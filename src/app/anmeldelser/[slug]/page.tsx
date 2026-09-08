import {notFound} from 'next/navigation';
import {resolvePage} from '@/lib/public-pages';
import {publicMetadata} from '@/lib/seo/page';
import {PublicPageView} from '@/components/public-page';
type Props={params:Promise<{slug:string}>};
// A price can expire between requests; this route cannot retain stale ISR markup.
export const dynamic='force-dynamic';
export async function generateMetadata({params}:Props){return publicMetadata(await resolvePage(`/anmeldelser/${(await params).slug}`));}
export default async function Page({params}:Props){const page=await resolvePage(`/anmeldelser/${(await params).slug}`);if(!page||page.type!=='article'||page.article.kind!=='review')notFound();return <PublicPageView page={page} />;}
