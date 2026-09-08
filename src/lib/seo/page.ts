import type {PublicPage} from '@/lib/public-pages';
import {readRuntimeConfig} from '@/lib/config';
import {pageMetadata,missingMetadata} from './metadata';
export function publicMetadata(page:PublicPage|null) {
 const runtime=readRuntimeConfig(process.env);
 if(!page) return missingMetadata(runtime);
 const kind=page.type==='article'?page.article.kind:page.type==='trust'?'page':page.type;
 return pageMetadata(runtime,page.path,page.seo,{kind,displayTitle:page.title,params:page.query.params,facet:page.query.facet,belowThreshold:'belowThreshold' in page&&page.belowThreshold});
}
