import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {checkOrigin,privateError} from '@/lib/auth/http';
import {tokenHash} from '@/lib/auth/session';
import {principalForSession} from '@/lib/editorial/repository';
import {invalidateNetworkViews} from '@/lib/network/invalidation';
import {networkCacheMode} from '@/lib/network/config';
import {privateHeaders} from '@/lib/seo/private';
export async function POST(request:Request){
 try{checkOrigin(request);}catch{return privateError();}const token=(await cookies()).get('editor_session')?.value;if(!token)return privateError();
 const principal=await principalForSession(tokenHash(token));if(principal?.role!=='editor')return privateError();
 try{z.strictObject({}).parse(await request.json());invalidateNetworkViews();return NextResponse.json({invalidated:true,mode:networkCacheMode()},{headers:privateHeaders});}catch{return privateError(400);}
}
