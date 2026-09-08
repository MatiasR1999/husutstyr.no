import {cookies} from 'next/headers';
import {privateError} from '@/lib/auth/http';
import {tokenHash} from '@/lib/auth/session';
import {principalForSession} from '@/lib/editorial/repository';
import {metricsPeriod,publicationMetrics} from '@/lib/editorial/metrics';
import {privateHeaders} from '@/lib/seo/private';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
 const token=(await cookies()).get('editor_session')?.value;if(!token)return privateError(401);
 const hash=tokenHash(token),principal=await principalForSession(hash);if(principal?.role!=='editor')return privateError();
 const query=new URL(request.url).searchParams;
 if([...query.keys()].length!==2)return privateError(400);
 const period=metricsPeriod.safeParse(Object.fromEntries(query));if(!period.success)return privateError(400);
 return Response.json(await publicationMetrics(hash,period.data),{headers:privateHeaders});
}
