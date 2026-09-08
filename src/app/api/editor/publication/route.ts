import {z} from 'zod';
import {NextResponse} from 'next/server';
import {currentSession} from '@/lib/auth/session';
import {checkOrigin,privateError,privateRedirect} from '@/lib/auth/http';
import {privateHeaders} from '@/lib/seo/private';
import {changePublication,publicationStatus,retryPublication} from '@/lib/editorial/publication';
import {queueDelivery} from '@/lib/editorial/delivery';
export const maxDuration=60;
const command=z.discriminatedUnion('operation',[z.strictObject({operation:z.enum(['publish','withdraw']),articleId:z.uuid(),revisionId:z.uuid(),requestId:z.uuid()}),z.strictObject({operation:z.literal('retry'),articleId:z.uuid(),eventId:z.uuid()})]);
export async function POST(request:Request) {
 try {
  checkOrigin(request);const session=await currentSession();if(!session||session.principal.role!=='editor') return privateError();const json=request.headers.get('content-type')?.includes('application/json');
  const input=command.parse(json?await request.json():Object.fromEntries(await request.formData()));
  const id=input.operation==='retry'?input.eventId:await changePublication(session.hash,input);
  const status=await publicationStatus(session.hash,id);if(status.snapshot.articleId!==input.articleId) return privateError();if(input.operation==='retry') await retryPublication(session.hash,id);await queueDelivery(id);
  return json?NextResponse.json({eventId:id,state:status.cache_state},{status:202,headers:privateHeaders}):privateRedirect(`/redaksjon/artikler/${input.articleId}`);
 } catch {return privateError();}
}
