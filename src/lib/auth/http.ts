import 'server-only';
import { NextResponse } from 'next/server';
import site from '@site';
import { readRuntimeConfig } from '@/lib/config';
import { privateHeaders } from '@/lib/seo/private';
export function cookieOptions(maxAge:number) { return {httpOnly:true,sameSite:'lax' as const,secure:!readRuntimeConfig(process.env).qa,path:'/',maxAge}; }
export function privateError(status=403) { return NextResponse.json({error:status===503?site.editorial.ui.unavailable:site.editorial.ui.forbidden},{status,headers:privateHeaders}); }
export function checkOrigin(request:Request) { if(request.headers.get('origin')!==new URL(readRuntimeConfig(process.env).identity.url).origin) throw new Error('Invalid origin'); }
export function privateRedirect(path:string) { return NextResponse.redirect(new URL(path,readRuntimeConfig(process.env).identity.url),{status:303,headers:privateHeaders}); }
