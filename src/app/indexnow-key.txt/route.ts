import {readRuntimeConfig} from '@/lib/config';
import {indexNowKey} from '@/lib/seo/indexnow';
export const dynamic='force-dynamic';
export function GET() {const runtime=readRuntimeConfig(process.env);if(runtime.qa||runtime.preview) return new Response(null,{status:404});try{return new Response(indexNowKey(process.env.INDEXNOW_KEY),{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});}catch{return new Response(null,{status:404});}}
