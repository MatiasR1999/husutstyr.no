import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { principalForSession } from '@/lib/editorial/repository';
export const sessionCookie='editor_session';
export const attemptCookie='editor_login';
export const opaqueToken=()=>randomBytes(32).toString('base64url');
export const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
export async function currentSession() {
  const raw=(await cookies()).get(sessionCookie)?.value;
  if(!raw) return null;
  const hash=tokenHash(raw), principal=await principalForSession(hash);
  return principal ? { hash, principal } : null;
}
