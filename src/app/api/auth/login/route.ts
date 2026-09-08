import { beginLogin } from '@/lib/auth/oidc';
import { attemptCookie } from '@/lib/auth/session';
import { cookieOptions, privateError } from '@/lib/auth/http';
import { NextResponse } from 'next/server';
import { privateHeaders } from '@/lib/seo/private';
export async function GET() { try {const {raw,url}=await beginLogin();const response=NextResponse.redirect(url,{status:303,headers:privateHeaders});response.cookies.set(attemptCookie,raw,cookieOptions(600));return response;} catch {return privateError(503);} }
