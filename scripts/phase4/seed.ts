import {neon} from '@neondatabase/serverless';
import {randomBytes,createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {z} from 'zod';
import site from '../../site.config';
import {parseContent} from '../../src/lib/domain/content';
import {validateSeoCopy} from '../../src/lib/seo/metadata';
import {qaConnection} from '../phase2/guard';
const db=neon(qaConnection());
const fixture=JSON.parse(await readFile('work/phase2-fixture.json','utf8')) as {authorId:string;categoryId:string;identities:{writer:string;editor:string}};
const token=createHash('sha256').update(randomBytes(32)).digest('hex');
await db`update editorial.sites set reserved_routes=${[...site.routes.reserved]},trust_routes=${site.trustPages.map(page=>page.slug)} where id=${site.id}`;
await db`insert into editorial.sessions(token_hash,principal_id,expires_at) values(${token},${fixture.identities.editor},now()+interval '30 minutes')`;
const copy=(id:number)=>{const key=String(id).padStart(3,'0'),value={title:site.qa.phase4.seoTitle.replace('{id}',key),description:site.qa.phase4.description.replace('{id}',key)};validateSeoCopy(value);return value;};
const topics:string[]=[];
for(const [slug,name] of [['qa-four',site.qa.phase4.topicFour],['qa-five',site.qa.phase4.topicFive]]) {
 const [row]=await db`insert into editorial.topics(site_id,locale,slug,name) values(${site.id},${site.locale},${slug},${name}) on conflict(site_id,locale,slug) do update set name=excluded.name returning id`;
 topics.push(z.uuid().parse(row?.id));
}
const base={version:1 as const,title:site.qa.phase4.title,summary:site.qa.article.summary,section:site.qa.article.section,blocks:site.qa.article.body.map(text=>({type:'paragraph' as const,text})),sources:[{url:site.qa.markers.source,title:site.qa.markers.evidence,checkedAt:site.qa.article.publishedAt}],research:[],topicIds:[] as string[]};
const records: {id:string;path:string;kind:string}[]=[];
async function publish(slug:string,payload:unknown) {
 const content=parseContent(payload),namespace=content.kind==='review'?'anmeldelser':content.kind==='page'?'_pages':site.qa.category.slug;
 let [article]=await db`select id,current_revision_id from editorial.articles where site_id=${site.id} and namespace=${namespace} and slug=${slug} and is_test=true`;
 if(!article){const [made]=await db`select editorial.create_article(${token},${fixture.categoryId},${slug},${JSON.stringify(content)}::jsonb,true) as id`;[article]=await db`select id,current_revision_id from editorial.articles where id=${made?.id}`;
 await db`select editorial.submit_revision(${token},${article?.id},${article?.current_revision_id})`;
 await db`select editorial.approve_revision(${token},${article?.id},${article?.current_revision_id})`;
 await db`select editorial.change_publication(${token},${article?.id},${article?.current_revision_id},'publish',${randomUUID()})`;
 }
 records.push({id:z.uuid().parse(article?.id),path:namespace==='_pages'?`/${slug}`:`/${namespace}/${slug}`,kind:content.kind});
}
try {
 for(let i=1;i<=24;i++) await publish(`qa-phase4-${i}`,{...base,kind:'article',title:i===24?site.qa.phase4.longTitle:`${base.title} ${i}`,seo:copy(i),topicIds:[...(i<=4?[topics[0]!]:[]),...(i<=5?[topics[1]!]:[])]});
 await publish('qa-phase4-news',{...base,kind:'news',seo:copy(25),news:{dateline:site.qa.phase4.manufacturer,occurredAt:site.qa.article.publishedAt}});
 for(const [i,mode] of ['eligible','owned','paid','missing','expired'].entries()) {
  const [product]=await db`insert into editorial.products(site_id,name,manufacturer,identifier,owned) values(${site.id},${site.qa.phase4.product},${site.qa.phase4.manufacturer},${mode},${mode==='owned'}) returning id`;
  const productId=z.uuid().parse(product?.id);
  if(mode!=='missing') await db`insert into editorial.prices(product_id,amount,currency,source,checked_at,valid_until) values(${productId},'123.45','NOK',${site.qa.markers.source},now()-interval '1 hour'*${mode==='expired'?25:1},now()+interval '1 hour'*${mode==='expired'?-1:23})`;
  await publish(`qa-phase4-${mode}`,{...base,kind:'review',seo:copy(30+i),review:{productId,rating:4,paid:mode==='paid',method:site.qa.markers.research}});
 }
 for(const [i,page] of site.trustPages.entries()) await publish(page.slug,{...base,kind:'page',page:{slug:page.slug},title:page.title,summary:page.todo,blocks:[{type:'paragraph',text:page.todo}],seo:copy(40+i)});
 const paths=[`/${site.qa.category.slug}`,`/forfatter/${site.qa.article.author.slug}`,'/emne/qa-four','/emne/qa-five','/anmeldelser'];let id=60;
 for(const path of paths) for(const page of [1,2]) await db`select editorial.register_page_metadata(${token},${path},${page},${JSON.stringify(copy(id++))}::jsonb)`;
 await writeFile('work/phase4-fixture.json',JSON.stringify({records,topics},null,2)+'\n');
 console.log(`PASS: ${records.length} isolated approved page fixtures and registered listing metadata.`);
} finally {await db`delete from editorial.sessions where token_hash=${token}`;}
