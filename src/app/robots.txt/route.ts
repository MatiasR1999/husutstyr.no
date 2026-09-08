import {readRuntimeConfig} from '@/lib/config';
import {robotsText} from '@/lib/seo/feeds';
export const dynamic='force-dynamic';
export function GET() {return new Response(robotsText(readRuntimeConfig(process.env)),{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});}
