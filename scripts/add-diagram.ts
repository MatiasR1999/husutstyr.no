import { neon } from '@neondatabase/serverless';
import './neon-retry';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import site from '../site.config';
import { diagramKeys } from '../src/lib/domain/diagrams';

// Places an author-made diagram into an existing article and republishes it through the ordinary
// submit, approve and publish procedures. The session is bootstrapped exactly as approve-content does;
// the resulting approval is bound to the new content hash, so the decision covers what actually ships.
const owner=process.env.DATABASE_URL_UNPOOLED;
if(!owner) throw new Error('DATABASE_URL_UNPOOLED must hold the migration owner connection');
if(process.env.SEO_QA_MODE==='true') throw new Error('Refusing to edit production content in QA mode');
if(new URL(owner).hostname.startsWith(site.qa.database.hostPrefix)) throw new Error('Refusing to edit the configured QA database');
const [slug,key,index,...rest]=process.argv.slice(2);
const caption=rest.join(' ');
if(!slug||!key||!index||!caption) throw new Error('Usage: add-diagram <slug> <diagramKey> <insertIndex> <caption>');
if(!(diagramKeys as readonly string[]).includes(key)) throw new Error(`Unknown diagram ${key}`);

const db=neon(owner);
const [editor]=await db`select id from editorial.principals where site_id=${site.id} and is_test=false and role='editor' and enabled=true limit 1`;
if(!editor) throw new Error('No enabled editor identity exists');
const token=createHash('sha256').update(randomUUID()).digest('hex');
await db`insert into editorial.sessions(token_hash,principal_id,expires_at) values(${token},${z.uuid().parse(editor.id)},now()+interval '30 minutes')`;
try {
 const [article]=await db`select a.id,a.current_revision_id,r.payload from editorial.articles a join editorial.revisions r on r.id=a.current_revision_id where a.site_id=${site.id} and a.slug=${slug} and a.is_test=false`;
 if(!article) throw new Error(`No article named ${slug}`);
 const payload=article.payload as {blocks:{type:string;key?:string}[]};
 if(payload.blocks.some(block=>block.type==='diagram'&&block.key===key)) {console.log(`SKIP: ${slug} already carries ${key}`);}
 else {
  const at=Number(index);
  if(!Number.isInteger(at)||at<0||at>payload.blocks.length) throw new Error(`Insert index ${index} is outside the block list`);
  const blocks=[...payload.blocks.slice(0,at),{type:'diagram',key,caption},...payload.blocks.slice(at)];
  const id=z.uuid().parse(article.id),current=z.uuid().parse(article.current_revision_id);
  const [saved]=await db`select editorial.save_revision(${token},${id},${current},${JSON.stringify({...payload,blocks})}::jsonb) as id`;
  const revision=z.uuid().parse(saved?.id);
  await db`select editorial.submit_revision(${token},${id},${revision})`;
  await db`select editorial.approve_revision(${token},${id},${revision})`;
  await db`select editorial.change_publication(${token},${id},${revision},'publish',${randomUUID()})`;
  console.log(`PUBLISHED: ${slug} now carries ${key} at block ${at}`);
 }
} finally { await db`delete from editorial.sessions where token_hash=${token}`; }
