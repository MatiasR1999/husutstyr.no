import {NextResponse} from 'next/server';
import {currentSession} from '@/lib/auth/session';
import {privateError} from '@/lib/auth/http';
import {privateHeaders} from '@/lib/seo/private';
import {publicationStatus} from '@/lib/editorial/publication';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {try{const session=await currentSession();if(!session||session.principal.role!=='editor') return privateError();return NextResponse.json(await publicationStatus(session.hash,(await params).id),{headers:privateHeaders});}catch{return privateError();}}
