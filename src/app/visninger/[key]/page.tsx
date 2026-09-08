import {notFound} from 'next/navigation';
import {resolvePage} from '@/lib/public-pages';
import {decodeView} from '@/lib/seo/listing';
import {publicMetadata} from '@/lib/seo/page';
import {PublicPageView} from '@/components/public-page';
type Props={params:Promise<{key:string}>};
export const revalidate=600;
export function generateStaticParams(){return [];}
async function read(props:Props){const decoded=decodeView((await props.params).key);return decoded?resolvePage(decoded.path,new URLSearchParams(decoded.query.params).toString()):null;}
export async function generateMetadata(props:Props){return publicMetadata(await read(props));}
export default async function Page(props:Props){const page=await read(props);if(!page) notFound();return <PublicPageView page={page} />;}
