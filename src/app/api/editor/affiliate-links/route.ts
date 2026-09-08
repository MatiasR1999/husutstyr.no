import {cookies} from 'next/headers';
import {sql} from 'drizzle-orm';
import {tokenHash} from '@/lib/auth/session';
import {checkOrigin,privateError} from '@/lib/auth/http';
import {editorDb,principalForSession} from '@/lib/editorial/repository';
import {affiliateDestination,affiliateInput} from '@/lib/domain/affiliate';
import {affiliateOrigins} from '@/lib/affiliate';
import {privateHeaders} from '@/lib/seo/private';
export async function POST(request:Request) {
 try{checkOrigin(request);}catch{return privateError();}
 const token=(await cookies()).get('editor_session')?.value;if(!token)return privateError(401);
 const hash=tokenHash(token),principal=await principalForSession(hash);if(principal?.role!=='editor')return privateError();
 try {
  const input=affiliateInput.parse(await request.json());
  input.destination=affiliateDestination(input.destination,affiliateOrigins()).href;
  const rows=await editorDb().execute<{id:string}>(sql`select editorial.register_affiliate(${hash},${JSON.stringify(input)}::jsonb) as id`);
  return Response.json({id:rows.rows[0]?.id},{status:201,headers:privateHeaders});
 }catch{return privateError(400);}
}
