import {sql} from 'drizzle-orm';
import {z} from 'zod';
import {revalidateTag} from 'next/cache';
import {cookies} from 'next/headers';
import {tokenHash} from '@/lib/auth/session';
import {editorDb} from '@/lib/editorial/repository';
import {cacheTag} from '@/lib/cache-tags';
import {validateSeoCopy} from '@/lib/seo/metadata';
import {readRuntimeConfig} from '@/lib/config';
import {privateHeaders} from '@/lib/seo/private';
export async function POST(request:Request) {
 if(request.headers.get('origin')!==readRuntimeConfig(process.env).identity.url) return new Response(null,{status:403,headers:privateHeaders});
 const token=(await cookies()).get('editor_session')?.value;if(!token)return new Response(null,{status:401,headers:privateHeaders});
 try {
  const input=z.object({path:z.string(),page:z.number().int().positive(),copy:z.object({title:z.string(),description:z.string()})}).parse(await request.json());validateSeoCopy(input.copy);
  await editorDb().execute(sql`select editorial.register_page_metadata(${tokenHash(token)},${input.path},${input.page},${JSON.stringify(input.copy)}::jsonb)`);
  revalidateTag(cacheTag('home'),{expire:0});revalidateTag(cacheTag('sitemap'),{expire:0});
  return new Response(null,{status:204,headers:privateHeaders});
 } catch {return new Response(null,{status:400,headers:privateHeaders});}
}
