import type {ConsentPolicy} from '../site-types';

const record=(value:unknown):value is Record<string,unknown>=>typeof value==='object'&&value!==null&&!Array.isArray(value);
// Read the actual cookie on every send; CMP APIs can retain an expired or changed choice in memory.
export function analyticsConsent(cookieHeader:string,policy:ConsentPolicy,now=Date.now()):boolean {
  try {
    const raw=cookieHeader.split(';').map(item=>item.trim()).find(item=>item.startsWith(`${policy.cookieName}=`));
    if(!raw)return false;
    const value:unknown=JSON.parse(decodeURIComponent(raw.slice(policy.cookieName.length+1)));
    if(!record(value)||value.revision!==policy.revision||!Array.isArray(value.categories)||!value.categories.includes('analytics')||!value.categories.includes('necessary'))return false;
    if(typeof value.consentTimestamp!=='string'||typeof value.lastConsentTimestamp!=='string')return false;
    const first=Date.parse(value.consentTimestamp),last=Date.parse(value.lastConsentTimestamp);
    return Number.isFinite(first)&&Number.isFinite(last)&&first<=last&&last<=now&&now-last<policy.retentionDays*86400000;
  }catch{return false;}
}
export function publicMeasurementUrl(raw:string,origin:string,excludedPaths:readonly string[]):string|null {
  try {
    const url=new URL(raw);
    if(url.origin!==origin||url.username||url.password||excludedPaths.some(path=>url.pathname===path||url.pathname.startsWith(`${path}/`)))return null;
    url.search='';url.hash='';return url.href;
  }catch{return null;}
}
export function clickProperties(data:DOMStringMap,origins:readonly string[]):{linkId:string;articleId:string;destination:string;placement:string}|null {
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const {affiliateId:linkId,articleId,destination,placement}=data;
  if(!linkId||!uuid.test(linkId)||!articleId||!uuid.test(articleId)||!placement||!/^body-\d{1,4}$/.test(placement)||!destination||!origins.includes(destination))return null;
  try{if(new URL(destination).origin!==destination)return null;}catch{return null;}
  return {linkId,articleId,destination,placement};
}
export function googleConsent(granted:boolean) {
  return {analytics_storage:granted?'granted':'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'} as const;
}
