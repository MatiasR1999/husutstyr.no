import {neon} from '@neondatabase/serverless';
import '../neon-retry';
import {randomBytes,createHash,randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {z} from 'zod';
import site from '../../site.config';
import {parseContent} from '../../src/lib/domain/content';
import {qaConnection} from '../phase2/guard';
const db=neon(qaConnection());
const fixture=JSON.parse(await readFile('work/phase2-fixture.json','utf8')) as {authorId:string;categoryId:string;identities:{writer:string;editor:string}};
const token=createHash('sha256').update(randomBytes(32)).digest('hex');
await db`update editorial.sites set affiliate_origins=${[site.qa.phase5.destinationOrigin]} where id=${site.id}`;
await db`insert into editorial.sessions(token_hash,principal_id,expires_at) values(${token},${fixture.identities.editor},now()+interval '30 minutes')`;
const links:{id:string;slug:string;relationship:string}[]=[],articles:{id:string;path:string;relationship:string}[]=[];
try {
 for(const [i,relationship] of ['commission','owned','private'].entries()) {
  const slug=`qa-phase5-${relationship}`,input={slug,destination:site.qa.phase5.destination,relationship:relationship==='owned'?'owned':'commission',disclosure:relationship==='owned'?site.qa.phase5.ownedDisclosure:site.qa.phase5.disclosure,productId:null};
  let [link]=await db`select id from editorial.affiliate_links where site_id=${site.id} and slug=${slug}`;
  if(!link)[link]=await db`select editorial.register_affiliate(${token},${JSON.stringify(input)}::jsonb) as id`;
  const linkId=z.uuid().parse(link?.id);links.push({id:linkId,slug,relationship});
  const payload=parseContent({version:1,kind:'article',title:`${site.qa.phase5.title} ${i+1}`,summary:site.qa.article.summary,section:site.qa.article.section,blocks:[...site.qa.article.body.map(text=>({type:'paragraph',text})),{type:'affiliate',linkId,label:site.qa.phase5.link}],seo:{title:site.qa.phase4.seoTitle.replace('{id}',String(90+i)),description:site.qa.phase4.description.replace('{id}',String(90+i))},sources:[],research:[],topicIds:[]});
  let [article]=await db`select id,current_revision_id from editorial.articles where site_id=${site.id} and namespace=${site.qa.category.slug} and slug=${slug}`;
  if(!article){const [made]=await db`select editorial.create_article(${token},${fixture.categoryId},${slug},${JSON.stringify(payload)}::jsonb,true) as id`;[article]=await db`select id,current_revision_id from editorial.articles where id=${made?.id}`;
   if(relationship!=='private'){await db`select editorial.submit_revision(${token},${article?.id},${article?.current_revision_id})`;await db`select editorial.approve_revision(${token},${article?.id},${article?.current_revision_id})`;await db`select editorial.change_publication(${token},${article?.id},${article?.current_revision_id},'publish',${randomUUID()})`;}
  }
  articles.push({id:z.uuid().parse(article?.id),path:`/${site.qa.category.slug}/${slug}`,relationship});
 }
 await writeFile('work/phase5-fixture.json',JSON.stringify({links,articles},null,2)+'\n');
 console.log('PASS: isolated commission/owned articles and an unpublished affiliate fixture.');
}finally{await db`delete from editorial.sessions where token_hash=${token}`;}
