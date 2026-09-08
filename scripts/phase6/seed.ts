import {neon} from '@neondatabase/serverless';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import site from '../../site.config';
import {parseContent} from '../../src/lib/domain/content';
import {qaConnection} from '../phase2/guard';
const db=neon(qaConnection()),fixture=JSON.parse(await readFile('work/phase2-fixture.json','utf8')) as {categoryId:string;identities:{editor:string}};
const hash=createHash('sha256').update(randomUUID()).digest('hex'),config=site.qa.phase6;
await db`update editorial.sites set network_registry=${JSON.stringify(site.qa.network)}::jsonb,network_origin=${site.qa.identity.url},network_niche=${config.niche} where id=${site.id}`;
await db`insert into editorial.topics(site_id,locale,slug,name) values(${site.id},${site.locale},${config.topic},${config.topicName}) on conflict(site_id,locale,slug) do nothing`;
const [topic]=await db`select id from editorial.topics where site_id=${site.id} and slug=${config.topic}`;
await db`insert into editorial.sessions(token_hash,principal_id,expires_at) values(${hash},${fixture.identities.editor},now()+interval '30 minutes')`;
const articles:Record<string,{id:string;revisionId:string;path:string}>={};
try{
 const [metadata]=await db`select id from editorial.page_metadata_editions where site_id=${site.id} and path=${`/emne/${config.topic}`} and page=1 limit 1`;
 if(!metadata)await db`select editorial.register_page_metadata(${hash},${`/emne/${config.topic}`},1,${JSON.stringify({title:site.qa.phase4.seoTitle.replace('{id}','117'),description:site.qa.phase4.description.replace('{id}','117')})}::jsonb)`;
 for(const [index,kind] of ['main','duplicate','unrelated','draft'].entries()){
  const slug=`${config.slug}-${kind}`,body=kind==='duplicate'?config.paragraph.replace(config.firstAnchor,config.firstAnchor.toLocaleUpperCase('nb')):config.paragraph;
  const payload=parseContent({version:1,kind:'article',title:config.title,summary:site.qa.article.summary,section:site.qa.article.section,blocks:[...site.qa.article.body.map(text=>({type:'paragraph',text})),{type:'paragraph',text:body}],sources:[],research:[],topicIds:kind==='unrelated'?[]:[topic!.id],seo:{title:site.qa.phase4.seoTitle.replace('{id}',String(110+index)),description:site.qa.phase4.description.replace('{id}',String(110+index))}});
  let [article]=await db`select id,current_revision_id from editorial.articles where site_id=${site.id} and slug=${slug}`;
  if(!article){const [created]=await db`select editorial.create_article(${hash},${fixture.categoryId},${slug},${JSON.stringify(payload)}::jsonb,true) as id`;[article]=await db`select id,current_revision_id from editorial.articles where id=${created!.id}`;}
  else {const [saved]=await db`select editorial.save_revision(${hash},${article.id},${article.current_revision_id},${JSON.stringify(payload)}::jsonb) as id`;article.current_revision_id=saved!.id;}
  const id=z.uuid().parse(article!.id),revisionId=z.uuid().parse(article!.current_revision_id);
  if(kind!=='draft'){await db`select editorial.submit_revision(${hash},${id},${revisionId})`;await db`select editorial.approve_revision(${hash},${id},${revisionId})`;await db`select editorial.change_publication(${hash},${id},${revisionId},'publish',${randomUUID()})`;}
  articles[kind]={id,revisionId,path:`/${site.qa.category.slug}/${slug}`};
 }
 await writeFile('work/phase6-fixture.json',JSON.stringify({articles,topicId:topic!.id},null,2)+'\n');console.log('PASS: isolated network fixtures use approved revisions and a separate unpublished draft.');
}finally{await db`delete from editorial.sessions where token_hash=${hash}`;}
