import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import './neon-retry';
import * as oidc from 'openid-client';
import { z } from 'zod';
import site from '../site.config';

// One-time provisioning. Runs the real Google flow locally so the subject claim comes from Google, never from a guess,
// then registers that identity as an editor. It reads only the subject and never stores a token.
const owner=process.env.DATABASE_URL_UNPOOLED;
if(!owner) throw new Error('DATABASE_URL_UNPOOLED must hold the migration owner connection');
if(process.env.SEO_QA_MODE==='true') throw new Error('Refusing to register a production identity in QA mode');
if(new URL(owner).hostname.startsWith(site.qa.database.hostPrefix)) throw new Error('Refusing to register against the configured QA database');
const clientId=process.env.OIDC_CLIENT_ID,clientSecret=process.env.OIDC_CLIENT_SECRET;
if(!clientId||!clientSecret) throw new Error('OIDC_CLIENT_ID and OIDC_CLIENT_SECRET are required');

const port=Number(process.env.REGISTER_PORT??8765),redirect=`http://localhost:${port}/callback`;
const config=await oidc.discovery(new URL(site.editorial.issuer),clientId,clientSecret);
const verifier=oidc.randomPKCECodeVerifier(),challenge=await oidc.calculatePKCECodeChallenge(verifier),state=oidc.randomState();
const authUrl=oidc.buildAuthorizationUrl(config,{redirect_uri:redirect,scope:'openid email',code_challenge:challenge,code_challenge_method:'S256',state});

console.log('\nAapne denne adressen i nettleseren og logg inn med redaktoerkontoen:\n');
console.log(authUrl.href+'\n');

const claims=await new Promise<{sub:string;email?:string}>((resolve,reject)=>{
 const server=createServer(async(request,response)=>{
  try{
   const url=new URL(request.url??'/',`http://localhost:${port}`);
   if(url.pathname!=='/callback'){response.writeHead(404).end();return;}
   const tokens=await oidc.authorizationCodeGrant(config,url,{expectedState:state,pkceCodeVerifier:verifier,idTokenExpected:true});
   const parsed=tokens.claims();
   if(!parsed?.sub) throw new Error('No subject claim returned');
   response.writeHead(200,{'content-type':'text/plain; charset=utf-8'}).end('Innlogging mottatt. Du kan lukke dette vinduet.');
   server.close();resolve({sub:String(parsed.sub),email:typeof parsed.email==='string'?parsed.email:undefined});
  }catch(error){response.writeHead(400).end('Feil');server.close();reject(error);}
 });
 server.listen(port);
 setTimeout(()=>{server.close();reject(new Error('Timed out waiting for the login callback'));},Number(process.env.REGISTER_TIMEOUT_MS??900000)).unref();
});

console.log(`\nMottatt identitet fra Google. E-post: ${claims.email??'ikke oppgitt'}`);
const db=neon(owner);
const [author]=await db`select id from editorial.authors where site_id=${site.id} and is_test=false limit 1`;
if(!author) throw new Error('No author record exists yet; run provision-production first');
const [row]=await db`insert into editorial.principals(site_id,issuer,subject,role,author_id,is_test)
 values(${site.id},${site.editorial.issuer},${claims.sub},'editor',${z.uuid().parse(author.id)},false)
 on conflict(site_id,issuer,subject) do update set role='editor',enabled=true returning id`;
console.log(`PASS: Registered ${claims.email??'the identity'} as editor for ${site.id}. Principal ${z.uuid().parse(row?.id)}.`);
console.log('PASS: No token was stored. Only the subject claim was written.');
