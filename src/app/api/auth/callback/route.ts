import { NextRequest } from 'next/server';
import { completeLogin } from '@/lib/auth/oidc';
import { attemptCookie,sessionCookie } from '@/lib/auth/session';
import { cookieOptions,privateError,privateRedirect } from '@/lib/auth/http';
export async function GET(request:NextRequest) {
  try {const raw=request.cookies.get(attemptCookie)?.value;if(!raw) return privateError();const token=await completeLogin(raw,request.nextUrl.search);const response=privateRedirect('/redaksjon');response.cookies.set(sessionCookie,token,cookieOptions(28800));response.cookies.set(attemptCookie,'',cookieOptions(0));return response;} catch {return privateError();}
}
