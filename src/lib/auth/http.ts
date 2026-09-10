import 'server-only';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import site from '@site';
import { readRuntimeConfig } from '@/lib/config';
import { privateHeaders } from '@/lib/seo/private';
export function cookieOptions(maxAge:number) { return {httpOnly:true,sameSite:'lax' as const,secure:!readRuntimeConfig(process.env).qa,path:'/',maxAge}; }
export function privateError(status=403,message?:string) { return NextResponse.json({error:message??(status===503?site.editorial.ui.unavailable:site.editorial.ui.forbidden)},{status,headers:privateHeaders}); }
// Maps the editorial procedures' own error names to an accurate message. Every branch is a condition the
// database itself raised, so nothing internal is disclosed beyond what the editor already needs to act on.
export function editorialError(error:unknown) {
 const ui=site.editorial.ui, message=error instanceof Error?error.message:'';
 if(error instanceof ZodError) return privateError(400,ui.invalid);
 if(message.includes('invalid_approval')) return privateError(409,ui.submitFirst);
 if(message.includes('stale_revision')) return privateError(409,ui.stale);
 if(message.includes('unauthorized')) return privateError(401,ui.unauthenticated);
 return privateError();
}
export function checkOrigin(request:Request) { if(request.headers.get('origin')!==new URL(readRuntimeConfig(process.env).identity.url).origin) throw new Error('Invalid origin'); }
export function privateRedirect(path:string) { return NextResponse.redirect(new URL(path,readRuntimeConfig(process.env).identity.url),{status:303,headers:privateHeaders}); }
