import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {load} from 'cheerio';
import {startQaServer} from '../qa-server';
import {startIssuer} from './oidc-issuer';
import site from '../../site.config';
const evidence=process.env.QA_EVIDENCE_DIR??'docs/qa/phase2';
const origin=site.qa.identity.url,fixture=JSON.parse(await readFile('work/phase2-fixture.json','utf8')),results:string[]=[];
const issuer=await startIssuer(),server=await startQaServer('phase2-auth');
const cookie=(response:Response,name:string)=>response.headers.getSetCookie().map(value=>value.split(';')[0]!).find(value=>value.startsWith(`${name}=`));
async function login(subject:string,scenario='valid') {
 const begin=await fetch(new URL('/api/auth/login',origin),{redirect:'manual'});assert.equal(begin.status,303);
 const browserCookie=cookie(begin,'editor_login');assert.ok(browserCookie);assert.match(begin.headers.get('set-cookie')??'',/HttpOnly/i);assert.match(begin.headers.get('set-cookie')??'',/SameSite=Lax/i);
 const authorization=new URL(begin.headers.get('location')!);authorization.searchParams.set('qa_subject',subject);authorization.searchParams.set('qa_scenario',scenario);
 const granted=await fetch(authorization,{redirect:'manual'});assert.equal(granted.status,302);
 const callback=new URL(granted.headers.get('location')!);if(scenario==='state') callback.searchParams.set('state','invalid-state');
 const response=await fetch(callback,{redirect:'manual',headers:{Cookie:browserCookie}});
 return {response,session:cookie(response,'editor_session'),callback,browserCookie};
}
const post=(path:string,session:string|undefined,body:unknown,requestOrigin:string|undefined=origin)=>fetch(new URL(path,origin),{method:'POST',redirect:'manual',headers:{'Content-Type':'application/json',...(session?{Cookie:session}:{}),...(requestOrigin?{Origin:requestOrigin}:{})},body:JSON.stringify(body)});
try {
 for(const [label,path,headers] of [
  ['private-html',`/redaksjon/artikler/${fixture.draft.id}`,{}],['private-rsc',`/redaksjon/artikler/${fixture.draft.id}`,{RSC:'1'}],
  ['draft-html',`/${site.qa.category.slug}/${fixture.draft.slug}`,{}],['draft-rsc',`/${site.qa.category.slug}/${fixture.draft.slug}`,{RSC:'1'}],
  ['draft-og',`/${site.qa.category.slug}/${fixture.draft.slug}/opengraph-image`,{}],['private-og',`/redaksjon/artikler/${fixture.draft.id}/opengraph-image`,{}],
 ] as const) {
  const response=await fetch(new URL(path,origin),{headers});const body=await response.text();assert.equal(response.status,404,label);assert.ok(!body.includes(site.qa.markers.draft));assert.ok(!body.includes(site.qa.markers.changed));assert.equal(load(body)('link[rel="canonical"]').length,0);
  await writeFile(`${evidence}/${label}.txt`,`HTTP ${response.status}\n${body}`);results.push(`${label}: anonymous request has no private text or canonical`);
 }
 for(const scenario of ['state','nonce','issuer','audience','expired','signature']) {const attempt=await login(site.qa.markers.editor,scenario);assert.equal(attempt.response.status,403);assert.equal(attempt.session,undefined);results.push(`OIDC rejects invalid ${scenario}`);}
 for(const subject of [site.qa.markers.outsider,site.qa.markers.viewer]) {const attempt=await login(subject);assert.equal(attempt.response.status,403);assert.equal(attempt.session,undefined);}
 results.push('Verified but unregistered identity and viewer cannot sign in as editors');
 const writer=await login(site.qa.markers.writer);assert.equal(writer.response.status,303);assert.ok(writer.session);
 const replay=await fetch(writer.callback,{redirect:'manual',headers:{Cookie:writer.browserCookie}});assert.equal(replay.status,403);results.push('OIDC login attempt and authorization code cannot be replayed');
 const editor=await login(site.qa.markers.editor);assert.equal(editor.response.status,303);assert.ok(editor.session);results.push('Signed OIDC authorization code flow with PKCE establishes writer and editor sessions');
 const privateResponse=await fetch(new URL(`/redaksjon/artikler/${fixture.draft.id}`,origin),{headers:{Cookie:writer.session}});const privateBody=await privateResponse.text();assert.equal(privateResponse.status,200);assert.ok(privateBody.includes(site.qa.markers.draft));assert.match(privateResponse.headers.get('cache-control')??'',/no-store/);assert.match(privateResponse.headers.get('x-robots-tag')??'',/noindex/);assert.equal(load(privateBody)('link[rel="canonical"]').length,0);results.push('Authorized private preview renders content with no-store and noindex');
 const path=`/api/editor/articles/${fixture.draft.id}`,command={action:'approve',revisionId:fixture.draft.current_revision_id};
 assert.equal((await post(path,undefined,command)).status,403);
 assert.equal((await post(path,'editor_session=forged',command)).status,403);
 assert.equal((await post(path,writer.session,command)).status,403);
 assert.equal((await post(path,editor.session,command,'https://example.invalid')).status,403);
 // Explicit nullish origin sent through a direct request verifies same-origin protection.
 assert.equal((await fetch(new URL(path,origin),{method:'POST',headers:{Cookie:editor.session,'Content-Type':'application/json'},body:JSON.stringify(command)})).status,403);
 assert.equal((await post(path,editor.session,{...command,approvedBy:fixture.identities.editor})).status,403);
 results.push('Anonymous, forged, writer approval, cross-origin, missing-origin and injected-actor requests denied');
 assert.equal((await post(path,writer.session,{action:'submit',revisionId:fixture.draft.current_revision_id})).status,303);
 assert.equal((await post(path,editor.session,command)).status,303);results.push('Editor can approve the exact revision submitted by an authenticated writer');
 assert.equal((await post(path,editor.session,{action:'publish',revisionId:fixture.draft.current_revision_id})).status,403);results.push('Phase 2 exposes no production publication action');
 const publicResponse=await fetch(new URL(`/${site.qa.category.slug}/${site.qa.article.slug}`,origin));const publicHtml=await publicResponse.text();assert.equal(publicResponse.status,200);assert.ok(!publicHtml.includes(site.qa.markers.changed));assert.ok(!publicHtml.includes(site.qa.markers.draft));results.push('Public HTML and embedded RSC still contain only the published revision after a draft edit');
 assert.equal((await post('/api/auth/logout',writer.session,{})).status,303);
 assert.equal((await fetch(new URL(`/redaksjon/artikler/${fixture.draft.id}`,origin),{headers:{Cookie:writer.session}})).status,404);results.push('Logout revokes the server-side session');
 await post('/api/auth/logout',editor.session,{});
 await writeFile(`${evidence}/http-tests.json`,JSON.stringify({checkedAt:new Date().toISOString(),passed:results.length,results,liveGoogleLogin:'Not tested: Google Cloud client credentials must be configured before launch.'},null,2)+'\n');
 console.log(`PASS: ${results.length} production-server OIDC, authorization and draft isolation checks.`);
} finally {await server.stop();await issuer.stop();}
