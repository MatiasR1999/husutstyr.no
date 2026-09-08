import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomBytes,createHash,timingSafeEqual } from 'node:crypto';
import { generateKeyPair,exportJWK,SignJWT } from 'jose';
import site from '../../site.config';
// A signed loopback-only protocol fixture. Never imported by application code.
export async function startIssuer() {
 if(process.env.SEO_QA_MODE!=='true' || process.env.OIDC_TEST_MODE!=='true' || process.env.VERCEL) throw new Error('OIDC fixture requires isolated local QA');
 const origin=new URL(site.qa.oidc.issuer),secret=process.env.OIDC_CLIENT_SECRET;
 if(!secret) throw new Error('Missing test client secret');
 const key=await generateKeyPair('RS256'),wrongKey=await generateKeyPair('RS256'),jwk={...await exportJWK(key.publicKey),kid:'qa-signing-key',use:'sig',alg:'RS256'};
 const codes=new Map<string,{nonce:string;challenge:string;subject:string;scenario:string;redirect:string;expires:number}>();
 const server=createServer(async(req,res)=>{
  try {
   const url=new URL(req.url??'/',origin);
   const json=(value:unknown,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
   if(url.pathname==='/.well-known/openid-configuration') return json({issuer:origin.origin,authorization_endpoint:new URL('/authorize',origin).href,token_endpoint:new URL('/token',origin).href,jwks_uri:new URL('/jwks',origin).href,response_types_supported:['code'],subject_types_supported:['public'],id_token_signing_alg_values_supported:['RS256'],token_endpoint_auth_methods_supported:['client_secret_post'],grant_types_supported:['authorization_code'],code_challenge_methods_supported:['S256']});
   if(url.pathname==='/jwks') return json({keys:[jwk]});
   if(url.pathname==='/authorize') {
    const redirect=url.searchParams.get('redirect_uri');
    if(redirect!==new URL('/api/auth/callback',site.qa.identity.url).href || url.searchParams.get('client_id')!==site.qa.oidc.clientId || url.searchParams.get('code_challenge_method')!=='S256') return json({error:'invalid_request'},400);
    const code=randomBytes(24).toString('hex');
    codes.set(code,{nonce:url.searchParams.get('nonce')??'',challenge:url.searchParams.get('code_challenge')??'',subject:url.searchParams.get('qa_subject')??site.qa.markers.writer,scenario:url.searchParams.get('qa_scenario')??'valid',redirect,expires:Date.now()+60000});
    const callback=new URL(redirect);callback.searchParams.set('code',code);callback.searchParams.set('state',url.searchParams.get('state')??'');
    res.writeHead(302,{Location:callback.href});res.end();return;
   }
   if(url.pathname==='/token' && req.method==='POST') {
    let body='';for await(const chunk of req){body+=String(chunk);if(body.length>16000) throw new Error('Body too large');}
    const data=new URLSearchParams(body),code=data.get('code')??'',grant=codes.get(code);codes.delete(code);
    const supplied=data.get('client_secret')??'';
    if(!grant || grant.expires<Date.now() || supplied.length!==secret.length || !timingSafeEqual(Buffer.from(supplied),Buffer.from(secret)) || data.get('client_id')!==site.qa.oidc.clientId || data.get('redirect_uri')!==grant.redirect || data.get('grant_type')!=='authorization_code' || createHash('sha256').update(data.get('code_verifier')??'').digest('base64url')!==grant.challenge) return json({error:'invalid_grant'},400);
    const token=await new SignJWT({nonce:grant.scenario==='nonce'?'invalid-nonce':grant.nonce}).setProtectedHeader({alg:'RS256',kid:jwk.kid}).setSubject(grant.subject).setIssuer(grant.scenario==='issuer'?new URL('/wrong',origin).href:origin.origin).setAudience(grant.scenario==='audience'?'wrong-client':site.qa.oidc.clientId).setIssuedAt().setExpirationTime(grant.scenario==='expired'?Math.floor(Date.now()/1000)-300:'5m').sign(grant.scenario==='signature'?wrongKey.privateKey:key.privateKey);
    return json({token_type:'Bearer',access_token:randomBytes(24).toString('hex'),expires_in:300,id_token:token});
   }
   json({error:'not_found'},404);
  } catch {res.writeHead(500);res.end();}
 });
 server.listen(Number(origin.port),origin.hostname);await once(server,'listening');
 return {stop:()=>new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))};
}
