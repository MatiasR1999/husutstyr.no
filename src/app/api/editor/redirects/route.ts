import {sql} from 'drizzle-orm';
import {NextResponse} from 'next/server';
import {currentSession} from '@/lib/auth/session';
import {checkOrigin,privateError} from '@/lib/auth/http';
import {editorDb} from '@/lib/editorial/repository';
import {redirectInput} from '@/lib/seo/redirects';
import {privateHeaders} from '@/lib/seo/private';
export async function POST(request:Request) {try{checkOrigin(request);const session=await currentSession();if(!session||session.principal.role!=='editor') return privateError();const input=redirectInput.parse(await request.json());await editorDb().execute(sql`select editorial.set_redirect(${session.hash},${input.source},${input.destination},${input.status})`);return NextResponse.json({saved:true},{headers:privateHeaders});}catch{return privateError();}}
