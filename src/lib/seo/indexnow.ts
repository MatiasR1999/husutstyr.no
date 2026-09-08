import site from '@site';
import type {RuntimeConfig} from '@/lib/config';
import {isLocalRequest} from '@/lib/config';
import {canonicalUrl} from './urls';
export type IndexNowResult={state:'sent'|'skipped'|'pending'|'rejected';delay:number;reason:string|null};
export function indexNowKey(value:string|undefined) {if(!value||!/^[A-Za-z0-9-]{8,128}$/.test(value)) throw new Error('IndexNow key is not configured');return value;}
export async function notifyIndexNow(runtime:RuntimeConfig,path:string,options:{key?:string;published:boolean;isTest:boolean;transport?:typeof fetch}):Promise<IndexNowResult> {
 const origin=new URL(runtime.identity.url);
 if(runtime.qa||runtime.preview||options.isTest||!options.published||isLocalRequest(origin)||origin.protocol!=='https:') return {state:'skipped',delay:0,reason:null};
 let key:string;try{key=indexNowKey(options.key);}catch{return {state:'pending',delay:3600,reason:'indexnow_not_configured'};}
 try {
  const response=await (options.transport??fetch)(site.delivery.indexNowEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(10000),body:JSON.stringify({host:origin.host,key,keyLocation:canonicalUrl(origin.href,site.delivery.indexNowKeyPath),urlList:[canonicalUrl(origin.href,path)]})});
  if(response.status===200||response.status===202) return {state:'sent',delay:0,reason:null};
  if(response.status===429||response.status>=500) {
   const header=response.headers.get('retry-after'),seconds=header&&/^\d+$/.test(header)?Number(header):header?Math.ceil((Date.parse(header)-Date.now())/1000):60;
   return {state:'pending',delay:Math.min(86400,Math.max(60,Number.isFinite(seconds)?seconds:60)),reason:`indexnow_${response.status}`};
  }
  return {state:'rejected',delay:0,reason:`indexnow_${response.status}`};
 } catch {return {state:'pending',delay:60,reason:'indexnow_transport'};}
}
