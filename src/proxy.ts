import {networkCacheMode} from './lib/network/config';
import {networkArticleCachePath} from './lib/seo/network-cache';
import {resolvePage} from './lib/public-pages';
import {parsePageQuery,encodeView,decodeView} from './lib/seo/listing';
import { NextRequest, NextResponse } from 'next/server';
import { assertQaContentAllowed, isLocalRequest, readRuntimeConfig } from './lib/config';
import { robotsHeaders } from './lib/seo/robots';
import { privateHeaders } from './lib/seo/private';
import { tokenHash } from './lib/auth/session';
import { principalForSession, documents } from './lib/editorial/repository';
import { routeDisposition } from './lib/public-data';
import { redirectTarget, goneHeaders } from './lib/seo/redirects';
import { isPublicSlug } from './lib/slug';
import { normalizedRequestUrl } from './lib/seo/urls';

export async function proxy(request: NextRequest) {
  const runtime = readRuntimeConfig(process.env);
  const requestUrl=new URL(request.url);let articleRoute=false;
  // The built QA snapshot must remain inaccessible after runtime env changes.
  const target = normalizedRequestUrl(requestUrl);
  let allowed = runtime.qa && isLocalRequest(requestUrl);
  if (!runtime.qa) { try { assertQaContentAllowed(runtime); allowed = true; } catch { allowed = false; } }
  // Reject private requests before React can stream response headers.
  const privatePath = target?.pathname ?? requestUrl.pathname;
  // OG input never accepts a title or revision query, even during a database outage.
  if(privatePath.startsWith('/og/')&&requestUrl.search) return new NextResponse(null,{status:404,headers:robotsHeaders(runtime)});
  if (allowed && (privatePath.startsWith('/redaksjon/artikler/') || privatePath === '/redaksjon/ny')) {
    const token = request.cookies.get('editor_session')?.value;
    const hash = token ? tokenHash(token) : null;
    const principal = hash ? await principalForSession(hash) : null;
    allowed = Boolean(principal && principal.role !== 'viewer');
    if (allowed && hash && privatePath.startsWith('/redaksjon/artikler/')) {
      const id = privatePath.split('/')[3];
      allowed = privatePath.split('/').length === 4 && (await documents(hash)).some(article => article.id === id);
    }
  }
  if(privatePath.startsWith('/visninger')||privatePath.startsWith('/_pages')) allowed=false;
  if (allowed && !/^\/(api|redaksjon|go)(\/|$)/.test(privatePath)) {
    const parts=privatePath.split('/').filter(Boolean);
    const disposition=await routeDisposition(privatePath);
    if(disposition?.status===410) return new NextResponse(null,{status:410,headers:goneHeaders});
    if(disposition?.status===301 && disposition.destination) return NextResponse.redirect(redirectTarget(requestUrl,disposition.destination),{status:301,headers:robotsHeaders(runtime)});
    if(parts[0]==='og') {
      const decoded=parts.length===2?decodeView(parts[1]!):null;
      const state=decoded?await routeDisposition(decoded.path):null;
      if(state?.status===410) return new NextResponse(null,{status:410,headers:goneHeaders});
      allowed=Boolean(decoded&&await resolvePage(decoded.path,new URLSearchParams(decoded.query.params).toString()));
    }
    else if(parts[0]==='emne'||parts[0]==='forfatter') allowed=Boolean(await resolvePage(privatePath));
    else if(parts.length>=2 && isPublicSlug(parts[0]!) && isPublicSlug(parts[1]!)) {
      const articleState=parts.length===2?disposition:await routeDisposition(`/${parts[0]}/${parts[1]}`);
      if(articleState?.status===410) return new NextResponse(null,{status:410,headers:goneHeaders});
      if(!articleState || articleState.status!==200) allowed=false;
      articleRoute=parts.length===2&&articleState?.status===200&&parts[0]!=='anmeldelser';
    }
  }
  const query=parsePageQuery(requestUrl.searchParams);
  const isContent=!/^\/(api|redaksjon|og|go)(\/|$)/.test(privatePath)&&!privatePath.includes('.');
  if(isContent&&!query) allowed=false;
  const rewrite=allowed&&articleRoute&&query?new URL(networkArticleCachePath(networkCacheMode(),privatePath,query.params),request.url):allowed&&isContent&&query&&Object.keys(query.params).length>0?new URL(`/visninger/${encodeView(privatePath,query.params)}`,request.url):null;
  const response = !allowed
    ? new NextResponse(null, { status: 404 })
    : target ? NextResponse.redirect(target, 301) : rewrite?NextResponse.rewrite(rewrite):NextResponse.next();
  if (requestUrl.pathname.startsWith('/redaksjon') || requestUrl.pathname.startsWith('/api/')) for (const [name,value] of Object.entries(privateHeaders)) response.headers.set(name,value);
  for (const [name, value] of Object.entries(requestUrl.pathname.startsWith('/redaksjon') || requestUrl.pathname.startsWith('/api/') ? {} : robotsHeaders(runtime))) response.headers.set(name, value);
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
