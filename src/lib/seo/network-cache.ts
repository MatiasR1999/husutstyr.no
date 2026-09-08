import {encodeView} from './listing';
export const networkArticlePattern='/visninger/artikkel/[mode]/[key]';
export function networkArticleCachePath(mode:string,path:string,params:Readonly<Record<string,string>>={}){return `/visninger/artikkel/${mode}/${encodeView(path,params)}`;}
