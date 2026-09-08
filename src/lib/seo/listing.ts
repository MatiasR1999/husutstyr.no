import site from '@site';
export interface PageQuery { readonly page:number;readonly facet:boolean;readonly params:Readonly<Record<string,string>>;readonly sort:'newest'|'oldest';readonly topic?:string }
export function parsePageQuery(search:URLSearchParams):PageQuery|null {
 const params:Record<string,string>={};
 for(const [key,value] of search) {
  if(key==='_rsc') continue;
  if(Object.hasOwn(params,key)||!['page','sort','topic'].includes(key)||value.length>100) return null;
  params[key]=value;
 }
 const page=params.page??'1';
 if(!/^[1-9]\d*$/.test(page)||!Number.isSafeInteger(Number(page))) return null;
 if(params.sort&&!['newest','oldest'].includes(params.sort)) return null;
 if(params.topic&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(params.topic)) return null;
 if(page==='1') delete params.page;
 return {page:Number(page),facet:Boolean(params.sort||params.topic),params,sort:params.sort==='oldest'?'oldest':'newest',...(params.topic?{topic:params.topic}:{})};
}
export function listingSlice<T>(items:readonly T[],page:number) {
 const pages=Math.max(1,Math.ceil(items.length/site.pageSize));
 return page>pages?null:{items:items.slice((page-1)*site.pageSize,page*site.pageSize),pages};
}
export function queryHref(path:string,params:Readonly<Record<string,string>>):string {
 const search=new URLSearchParams(Object.entries(params).filter(([key,value])=>!(key==='page'&&value==='1')).sort(([a],[b])=>a.localeCompare(b,'en'))).toString();
 return path+(search?`?${search}`:'');
}
// Internal path encoding gives each query variant its own ISR cache entry.
export function encodeView(path:string,params:Readonly<Record<string,string>>={}):string {return Buffer.from(queryHref(path,params)).toString('base64url');}
export function decodeView(key:string):{path:string;query:PageQuery}|null {
 if(!/^[\w-]{1,2048}$/.test(key)) return null;
 const decoded=Buffer.from(key,'base64url').toString('utf8');
 if(!/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?)?(?:\?[^#]*)?$/.test(decoded)) return null;
 const [path,search]=decoded.split('?');const query=parsePageQuery(new URLSearchParams(search));
 return path&&query?{path,query}:null;
}
