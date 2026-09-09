import { neon } from '@neondatabase/serverless';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { z } from 'zod';
import site from '../site.config';
import { parseContent } from '../src/lib/domain/content';
import { isPublicSlug } from '../src/lib/slug';

// Creates drafts only. Approval and publication stay a human action, which is the guarantee the site states publicly.
const owner=process.env.DATABASE_URL_UNPOOLED;
if(!owner) throw new Error('DATABASE_URL_UNPOOLED must hold the migration owner connection');
if(process.env.SEO_QA_MODE==='true') throw new Error('Refusing to import production content in QA mode');
if(new URL(owner).hostname.startsWith(site.qa.database.hostPrefix)) throw new Error('Refusing to import against the configured QA database');
const db=neon(owner);

const [writer]=await db`select id from editorial.principals where site_id=${site.id} and is_test=false and role in ('writer','editor') and enabled=true limit 1`;
if(!writer) throw new Error('No enabled writer or editor identity exists yet. Register the publisher OIDC identity before importing.');
const principalId=z.uuid().parse(writer.id);

const files=(await readdir('content/articles')).filter(name=>name.endsWith('.json'));
const entries=[];
for(const file of files) entries.push(...z.array(z.object({categorySlug:z.string(),slug:z.string(),content:z.unknown()})).parse(JSON.parse(await readFile(`content/articles/${file}`,'utf8'))));
if(!entries.length) throw new Error('No article files found under content/articles');

const token=createHash('sha256').update(randomUUID()).digest('hex');
await db`insert into editorial.sessions(token_hash,principal_id,expires_at) values(${token},${principalId},now()+interval '30 minutes')`;
let created=0,existing=0;
try {
 for(const entry of entries){
  if(!isPublicSlug(entry.slug)) throw new Error(`Invalid slug: ${entry.slug}`);
  const payload=parseContent(entry.content);
  if(/TODO:|\bQA:/.test(JSON.stringify(payload))) throw new Error(`Placeholder text remains in ${entry.slug}`);
  const [category]=await db`select id from editorial.categories where site_id=${site.id} and locale=${site.locale} and slug=${entry.categorySlug}`;
  if(!category) throw new Error(`Unknown category ${entry.categorySlug} for ${entry.slug}`);
  const [found]=await db`select id from editorial.articles where site_id=${site.id} and namespace=${entry.categorySlug} and slug=${entry.slug}`;
  if(found){existing++;continue;}
  await db`select editorial.create_article(${token},${z.uuid().parse(category.id)},${entry.slug},${JSON.stringify(payload)}::jsonb,false)`;
  created++;
 }
} finally { await db`delete from editorial.sessions where token_hash=${token}`; }
console.log(`PASS: ${created} drafts created, ${existing} already present, ${entries.length} entries read.`);
console.log('PASS: Nothing was submitted, approved or published. A human editor must review each revision in /redaksjon.');
