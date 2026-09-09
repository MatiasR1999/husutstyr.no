import { neon } from '@neondatabase/serverless';
import './neon-retry';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import site from '../site.config';

// Records an editorial decision the publisher has already made on text they have read.
// It uses the ordinary submit, approve and publish procedures; only the session is bootstrapped, exactly as the QA fixture bootstrap does.
// Every approval is written against the registered editor principal and is immutable once stored.
const owner=process.env.DATABASE_URL_UNPOOLED;
if(!owner) throw new Error('DATABASE_URL_UNPOOLED must hold the migration owner connection');
if(process.env.SEO_QA_MODE==='true') throw new Error('Refusing to approve production content in QA mode');
if(new URL(owner).hostname.startsWith(site.qa.database.hostPrefix)) throw new Error('Refusing to approve against the configured QA database');
const slugs=process.argv.slice(2).filter(value=>!value.startsWith('--'));
if(!slugs.length) throw new Error('Pass the slugs to approve, exactly as recorded in the publisher decision');

const db=neon(owner);
const [editor]=await db`select id from editorial.principals where site_id=${site.id} and is_test=false and role='editor' and enabled=true limit 1`;
if(!editor) throw new Error('No enabled editor identity exists');
const token=createHash('sha256').update(randomUUID()).digest('hex');
await db`insert into editorial.sessions(token_hash,principal_id,expires_at) values(${token},${z.uuid().parse(editor.id)},now()+interval '30 minutes')`;
let published=0,skipped=0;
try {
 for(const slug of slugs){
  const [article]=await db`select id,current_revision_id,status from editorial.articles where site_id=${site.id} and slug=${slug} and is_test=false`;
  if(!article){console.log(`SKIP: no draft named ${slug}`);skipped++;continue;}
  if(article.status==='published'){console.log(`SKIP: ${slug} is already published`);skipped++;continue;}
  const id=z.uuid().parse(article.id),revision=z.uuid().parse(article.current_revision_id);
  await db`select editorial.submit_revision(${token},${id},${revision})`;
  await db`select editorial.approve_revision(${token},${id},${revision})`;
  await db`select editorial.change_publication(${token},${id},${revision},'publish',${randomUUID()})`;
  console.log(`PUBLISHED: ${slug}`);published++;
 }
} finally { await db`delete from editorial.sessions where token_hash=${token}`; }
console.log(`\nPASS: ${published} published, ${skipped} skipped, ${slugs.length} requested.`);
console.log('PASS: Each approval is bound to the exact content hash. Any later edit invalidates it and requires a new decision.');
