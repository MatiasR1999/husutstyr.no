import 'server-only';
import * as oidc from 'openid-client';
import { and, eq, gt } from 'drizzle-orm';
import site from '@site';
import { readRuntimeConfig, isLocalRequest } from '@/lib/config';
import { editorDb } from '@/lib/editorial/repository';
import { loginAttempts, principals, sessions } from '@/lib/db/schema';
import { opaqueToken, tokenHash } from './session';

export async function provider() {
  const runtime=readRuntimeConfig(process.env);
  const useTest=process.env.OIDC_TEST_MODE==='true';
  if(useTest && (!runtime.qa || !isLocalRequest(new URL(runtime.identity.url)) || process.env.VERCEL!==undefined)) throw new Error('Test identity provider forbidden');
  const issuer=useTest ? site.qa.oidc.issuer : site.editorial.issuer;
  const clientId=useTest ? site.qa.oidc.clientId : process.env.OIDC_CLIENT_ID;
  const secret=process.env.OIDC_CLIENT_SECRET;
  if(!clientId || !secret) throw new Error('OIDC credentials not configured');
  const config=await oidc.discovery(new URL(issuer),clientId,secret,undefined,useTest ? {execute:[oidc.allowInsecureRequests]} : undefined);
  oidc.enableNonRepudiationChecks(config);
  return { config,issuer,callback:new URL('/api/auth/callback',runtime.identity.url).href };
}
export async function beginLogin() {
  const {config,callback}=await provider();
  const raw=opaqueToken(),state=oidc.randomState(),nonce=oidc.randomNonce(),verifier=oidc.randomPKCECodeVerifier();
  await editorDb().insert(loginAttempts).values({ tokenHash:tokenHash(raw),state,nonce,verifier,expiresAt:new Date(Date.now()+600000).toISOString() });
  const url=oidc.buildAuthorizationUrl(config,{ redirect_uri:callback,scope:'openid',state,nonce,code_challenge:await oidc.calculatePKCECodeChallenge(verifier),code_challenge_method:'S256' });
  return {raw,url};
}
export async function completeLogin(raw:string,query:string) {
  const rows=await editorDb().delete(loginAttempts).where(and(eq(loginAttempts.tokenHash,tokenHash(raw)),gt(loginAttempts.expiresAt,new Date().toISOString()))).returning();
  const attempt=rows[0];
  if(!attempt) throw new Error('Missing or expired login attempt');
  const {config,issuer,callback}=await provider();
  const tokens=await oidc.authorizationCodeGrant(config,new URL(`${callback}${query}`),{expectedState:attempt.state,expectedNonce:attempt.nonce,pkceCodeVerifier:attempt.verifier,idTokenExpected:true});
  const claims=tokens.claims();
  if(!claims || claims.iss!==issuer) throw new Error('Invalid issuer');
  const matches=await editorDb().select().from(principals).where(and(eq(principals.siteId,site.id),eq(principals.issuer,issuer),eq(principals.subject,claims.sub),eq(principals.enabled,true),eq(principals.isTest,readRuntimeConfig(process.env).qa))).limit(1);
  const principal=matches[0];
  if(!principal || principal.role==='viewer') throw new Error('Identity has no editorial access');
  const token=opaqueToken();
  await editorDb().insert(sessions).values({tokenHash:tokenHash(token),principalId:principal.id,expiresAt:new Date(Date.now()+28800000).toISOString()});
  return token;
}
