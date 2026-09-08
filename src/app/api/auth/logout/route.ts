import { eq } from 'drizzle-orm';
import { currentSession,sessionCookie } from '@/lib/auth/session';
import { sessions } from '@/lib/db/schema';
import { editorDb } from '@/lib/editorial/repository';
import { checkOrigin,cookieOptions,privateError,privateRedirect } from '@/lib/auth/http';
export async function POST(request:Request) {try {checkOrigin(request);const session=await currentSession();if(session) await editorDb().delete(sessions).where(eq(sessions.tokenHash,session.hash));const response=privateRedirect('/redaksjon');response.cookies.set(sessionCookie,'',cookieOptions(0));return response;} catch {return privateError();}}
