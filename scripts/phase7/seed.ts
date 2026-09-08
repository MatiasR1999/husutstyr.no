import {neon} from '@neondatabase/serverless';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import site from '../../site.config';
import {parseContent} from '../../src/lib/domain/content';
import {qaConnection} from '../phase2/guard';
const db=neon(qaConnection()),config=site.qa.phase7;
const fixture=JSON.parse(await readFile('work/phase2-fixture.json','utf8')) as {categoryId:string;identities:{editor:string}};
const token=createHash('sha256').update(randomUUID()).digest('hex');
// Distinct real specification lines exercise long-text transfer without inventing editorial recommendations.
const lines=(await readFile('docs/seo-template-spec.md','utf8')).split('\n').filter(line=>/^[A-K]\d\d:/.test(line)).slice(0,65);
const paragraphs=lines.map(text=>({type:'paragraph' as const,text:`${config.paragraph} ${text}`}));
const [asset]=await db`insert into editorial.assets(site_id,provider,object_key,url,alt,rights,width,height) values(${site.id},'vercel-blob','phase7-image',${config.imageUrl},${config.imageAlt},${config.imageRights},1600,900) on conflict(site_id,object_key) do update set url=excluded.url,provider=excluded.provider returning id`;
const image={type:'image',image:{assetId:asset!.id,url:config.imageUrl,alt:config.imageAlt,rights:config.imageRights,width:1600,height:900}};
const payload=parseContent({version:1,kind:'article',title:config.title,summary:site.qa.article.summary,section:site.qa.article.section,blocks:[{...image,preload:true},...paragraphs.slice(0,25),image,...paragraphs.slice(25)],seo:{title:site.qa.phase4.seoTitle.replace('{id}','701'),description:site.qa.phase4.description.replace('{id}','701')},sources:[],research:[],topicIds:[]});
await db`insert into editorial.sessions(token_hash,principal_id,expires_at) values(${token},${fixture.identities.editor},now()+interval '15 minutes')`;
try {
 let [article]=await db`select id,current_revision_id from editorial.articles where site_id=${site.id} and slug=${config.slug} and is_test=true`;
 if(!article){const [created]=await db`select editorial.create_article(${token},${fixture.categoryId},${config.slug},${JSON.stringify(payload)}::jsonb,true) as id`;[article]=await db`select id,current_revision_id from editorial.articles where id=${created!.id}`;}
 else {const [saved]=await db`select editorial.save_revision(${token},${article.id},${article.current_revision_id},${JSON.stringify(payload)}::jsonb) as id`;article.current_revision_id=saved!.id;}
 await db`select editorial.submit_revision(${token},${article!.id},${article!.current_revision_id})`;
 await db`select editorial.approve_revision(${token},${article!.id},${article!.current_revision_id})`;
 await db`select editorial.change_publication(${token},${article!.id},${article!.current_revision_id},'publish',${randomUUID()})`;
 await writeFile('work/phase7-fixture.json',JSON.stringify({path:`/${site.qa.category.slug}/${config.slug}`,revisionId:article!.current_revision_id,paragraphs:paragraphs.length,textCharacters:paragraphs.reduce((n,p)=>n+p.text.length,0),images:2,imageDimensions:[1600,900],source:'Distinct requirement lines plus explicit QA markers; no genuine product content'},null,2)+'\n');
 console.log('PASS: Approved isolated long-article fixture with 65 distinct paragraphs and two dimensioned image blocks.');
}finally{await db`delete from editorial.sessions where token_hash=${token}`;}
