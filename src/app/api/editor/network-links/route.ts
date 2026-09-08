import {cookies} from 'next/headers';
import {sql} from 'drizzle-orm';
import {z} from 'zod';
import {NextResponse} from 'next/server';
import {checkOrigin,privateError} from '@/lib/auth/http';
import {tokenHash} from '@/lib/auth/session';
import {editorDb,principalForSession,documents} from '@/lib/editorial/repository';
import {networkInput,validatePlacement} from '@/lib/network/policy';
import {networkRegistry} from '@/lib/network/config';
import {invalidateNetworkViews} from '@/lib/network/invalidation';
import {privateHeaders} from '@/lib/seo/private';
import {readRuntimeConfig} from '@/lib/config';
import site from '@site';
async function actor(request:Request){try{checkOrigin(request);}catch{return null;}const token=(await cookies()).get('editor_session')?.value;if(!token)return null;const hash=tokenHash(token),principal=await principalForSession(hash);return principal?.role==='editor'?hash:null;}
export async function POST(request:Request){
 const hash=await actor(request);if(!hash)return privateError();
 try{
  const registry=networkRegistry();if(!registry)return privateError(409);
  const input=networkInput.parse(await request.json()),article=(await documents(hash)).find(article=>article.id===input.articleId&&article.revisionId===input.revisionId&&article.approved);
  if(!article||article.payload.kind==='page')return privateError(400);
  const runtime=readRuntimeConfig(process.env);
  validatePlacement(input,registry,runtime.qa?site.qa.phase6.niche:site.niche,runtime.identity.url,article.payload.blocks,[input.topicSlug],runtime.qa);
  const result=await editorDb().execute(sql`select editorial.register_network_link(${hash},${JSON.stringify({...input,registryVersion:registry.version})}::jsonb) as id`);
  invalidateNetworkViews();return NextResponse.json({id:z.uuid().parse(result.rows[0]?.id)},{status:201,headers:privateHeaders});
 }catch{return privateError(400);}
}
export async function PATCH(request:Request){const hash=await actor(request);if(!hash)return privateError();try{const input=z.strictObject({id:z.uuid(),enabled:z.boolean()}).parse(await request.json());await editorDb().execute(sql`select editorial.set_network_link_enabled(${hash},${input.id},${input.enabled})`);invalidateNetworkViews();return NextResponse.json({updated:true},{headers:privateHeaders});}catch{return privateError(400);}}
