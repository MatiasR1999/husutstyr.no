import { neon } from '@neondatabase/serverless';
import { randomBytes,createHash } from 'node:crypto';
import { writeFile,chmod } from 'node:fs/promises';
import { z } from 'zod';
import site from '../../site.config';
import { parseContent } from '../../src/lib/domain/content';
import { qaConnection } from './guard';
const owner=qaConnection(),db=neon(owner);
const random=()=>randomBytes(32).toString('hex');
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
const connection=(role:string,password:string)=>{const url=new URL(owner);url.username=role;url.password=password;return url.href;};
const readerPassword=random(),editorPassword=random(),secret=random();
// Passwords are generated hex values; identifiers are fixed, never user input.
await db.query(`ALTER ROLE seo_public_reader LOGIN PASSWORD '${readerPassword}'`);
await db.query(`ALTER ROLE seo_editor_service LOGIN PASSWORD '${editorPassword}'`);
await db`insert into editorial.sites(id,reserved_routes) values(${site.id},${[...site.routes.reserved]}) on conflict(id) do update set reserved_routes=excluded.reserved_routes`;
await db`insert into editorial.locales values(${site.id},${site.locale}) on conflict do nothing`;
const [author]=await db`insert into editorial.authors(site_id,slug,name,bio,expertise,same_as,is_test) values(${site.id},${site.qa.article.author.slug},${site.qa.article.author.name},${site.qa.markers.bio},${[site.qa.markers.expertise]},${[]},true) on conflict(site_id,slug) do update set name=excluded.name returning id`;
const authorId=z.uuid().parse(author?.id);
const [category]=await db`insert into editorial.categories(site_id,locale,slug,name,introduction,seo) values(${site.id},${site.locale},${site.qa.category.slug},${site.qa.category.name},${site.content.category},${JSON.stringify({title:site.qa.category.title,description:site.qa.category.description})}::jsonb) on conflict(site_id,locale,slug) do update set name=excluded.name returning id`;
const categoryId=z.uuid().parse(category?.id);
const identities:Record<string,string>={};
for(const role of ['writer','editor','viewer'] as const) {
 const [p]=await db`insert into editorial.principals(site_id,issuer,subject,role,author_id,is_test) values(${site.id},${site.qa.oidc.issuer},${site.qa.markers[role]},${role},${authorId},true) on conflict(site_id,issuer,subject) do update set enabled=true returning id`;
 identities[role]=z.uuid().parse(p?.id);
}
const writer=random(),editor=random();
await db`insert into editorial.sessions(token_hash,principal_id,expires_at) values(${hash(writer)},${identities.writer},now()+interval '10 minutes'),(${hash(editor)},${identities.editor},now()+interval '10 minutes')`;
const content=parseContent({version:1,kind:'article',title:site.qa.article.title,summary:site.qa.article.summary,section:site.qa.article.section,blocks:site.qa.article.body.map(text=>({type:'paragraph',text})),seo:site.qa.article.seo,sources:[{url:site.qa.markers.source,title:site.qa.markers.evidence,checkedAt:site.qa.article.publishedAt}],research:[{method:site.qa.markers.research,responsibleAuthorId:authorId,performedAt:site.qa.article.publishedAt,evidence:[{url:site.qa.markers.source,description:site.qa.markers.evidence}]}],topicIds:[]});
let [article]=await db`select id,current_revision_id from editorial.articles where site_id=${site.id} and namespace=${site.qa.category.slug} and slug=${site.qa.article.slug}`;
if(!article) {
 const [created]=await db`select editorial.create_article(${hash(writer)},${categoryId},${site.qa.article.slug},${JSON.stringify(content)}::jsonb,true) as id`;
 const [row]=await db`select id,current_revision_id from editorial.articles where id=${created?.id}`;article=row;
 await db`select editorial.submit_revision(${hash(writer)},${article?.id},${article?.current_revision_id})`;
 await db`select editorial.approve_revision(${hash(editor)},${article?.id},${article?.current_revision_id})`;
 // Only this guarded local fixture bootstrap may set publication before phase 3.
 await db`update editorial.articles set status='published',published_revision_id=current_revision_id,published_at=${site.qa.article.publishedAt},modified_at=${site.qa.article.modifiedAt} where id=${article?.id} and is_test=true`;
}
let [draft]=await db`select id,current_revision_id,slug from editorial.articles where site_id=${site.id} and slug='private-draft' and namespace=${site.qa.category.slug}`;
if(!draft) {
 const [created]=await db`select editorial.create_article(${hash(writer)},${categoryId},'private-draft',${JSON.stringify({...content,title:site.qa.markers.draft,summary:site.qa.markers.draft,blocks:[{type:'paragraph',text:site.qa.markers.draft}]})}::jsonb,true) as id`;
 [draft]=await db`select id,current_revision_id,slug from editorial.articles where id=${created?.id}`;
}
await db`delete from editorial.sessions where token_hash in (${hash(writer)},${hash(editor)})`;
const env={DATABASE_URL:connection('seo_public_reader',readerPassword),EDITOR_DATABASE_URL:connection('seo_editor_service',editorPassword),SEO_QA_MODE:'true',NETWORK_LINKS_ENABLED:'false',OIDC_TEST_MODE:'true',OIDC_CLIENT_SECRET:secret,NEON_BRANCH:site.qa.database.branchName};
await writeFile('.env.phase2.local',Object.entries(env).map(([key,value])=>`${key}=${value}`).join('\n')+'\n',{mode:0o600});await chmod('.env.phase2.local',0o600);
await writeFile('work/phase2-fixture.json',JSON.stringify({authorId,categoryId,identities,article,draft},null,2)+'\n');
const reader=neon(env.DATABASE_URL),service=neon(env.EDITOR_DATABASE_URL);
await reader`select id from editorial.published_articles limit 1`;
await service`select id from editorial.principals limit 1`;
console.log('PASS: isolated QA fixture, restricted reader/editor connections and private runtime env created.');
