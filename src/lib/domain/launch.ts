import type {Environment} from '../config';
import type {SiteDefinition} from '../site-types';
import {validateSeoCopy} from '../seo/metadata';
import {authorSnapshotSchema,parseContent} from './content';

export interface LaunchArticle {readonly slug:string;readonly is_test:boolean;readonly payload:unknown;readonly author_snapshot:unknown}
export interface LaunchInventory {readonly articles:readonly LaunchArticle[];readonly categories:readonly unknown[]}
const unfinished=(value:unknown)=>/TODO:|\bQA:/.test(JSON.stringify(value)??'');
export function launchConfigIssues(site:SiteDefinition,env:Environment):string[] {
 const issues:string[]=[];
 for(const [key,value] of Object.entries({identity:site.identity,niche:site.niche,tone:site.toneOfVoice,home:site.home,content:site.content}))if(!value||unfinished(value))issues.push(`unfinished-config:${key}`);
 try {const url=new URL(site.identity.url);if(url.protocol!=='https:'||url.origin!==site.identity.url||url.username||url.password||env.SITE_URL!==url.origin)throw new Error();}catch{issues.push('invalid-production-origin');}
 try{validateSeoCopy(site.home);}catch{issues.push('invalid-home-metadata');}
 for(const [name,role] of [['DATABASE_URL','seo_public_reader'],['EDITOR_DATABASE_URL','seo_editor_service']] as const){try{const url=new URL(env[name]??'');if(!['postgres:','postgresql:'].includes(url.protocol)||url.username!==role)throw new Error();}catch{issues.push(`invalid-role:${name}`);}}
 for(const name of ['OIDC_CLIENT_ID','OIDC_CLIENT_SECRET'] as const)if(!env[name])issues.push(`missing-secret:${name}`);
 if((env.PUBLICATION_WORKER_SECRET?.length??0)<32)issues.push('missing-secret:PUBLICATION_WORKER_SECRET');
 if(!/^[a-zA-Z0-9-]{8,128}$/.test(env.INDEXNOW_KEY??''))issues.push('missing-secret:INDEXNOW_KEY');
 if(env.SEO_QA_MODE==='true'||env.OIDC_TEST_MODE==='true')issues.push('test-mode-enabled');
 if(env.NETWORK_LINKS_ENABLED!==undefined&&env.NETWORK_LINKS_ENABLED!=='false')issues.push('network-must-start-disabled');
 return issues;
}
// A portrait is optional: the publisher may choose not to have one, and Google does not require it for authorship.
// When one is present it must still carry a rights note, because publishing an image without documented rights is the actual risk.
export function launchContentIssues(site:SiteDefinition,inventory:LaunchInventory):string[] {
 const issues:string[]=[],trust=new Set<string>();let articles=0;
 if(!inventory.categories.length)issues.push('missing-categories');
 for(const category of inventory.categories)if(unfinished(category))issues.push('unfinished-category');
 for(const [index,row] of inventory.articles.entries()) {
  const key=`published:${index}`;
  if(row.is_test||unfinished(row.payload)||unfinished(row.author_snapshot)){issues.push(`${key}:test-or-todo`);continue;}
  try {
   const content=parseContent(row.payload),author=authorSnapshotSchema.parse(row.author_snapshot);
   if(author.is_test||!author.name.trim()||!author.bio.trim()||(author.image?!author.image.rights.trim():false)||!author.expertise?.length||!author.sameAs?.length)issues.push(`${key}:incomplete-author`);
   if(content.kind==='page')trust.add(content.page.slug);else articles++;
  }catch{issues.push(`${key}:invalid-published-revision`);}
 }
 for(const page of site.trustPages)if(!trust.has(page.slug))issues.push(`missing-trust-page:${page.slug}`);
 if(!articles)issues.push('no-published-articles');
 return issues;
}
