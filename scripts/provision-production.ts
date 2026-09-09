import { Pool, neonConfig, neon } from '@neondatabase/serverless';
import './neon-retry';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, chmod } from 'node:fs/promises';
import site from '../site.config';
import { validateSeoCopy } from '../src/lib/seo/metadata';
import { isPublicSlug } from '../src/lib/slug';
import { z } from 'zod';

const categorySchema=z.object({slug:z.string(),name:z.string().min(1),introduction:z.string().min(1),seo:z.object({title:z.string(),description:z.string()})});
const authorSchema=z.object({name:z.string().min(1),slug:z.string(),bio:z.string().min(1),expertise:z.array(z.string().min(1)).min(1),
 image:z.object({url:z.url(),alt:z.string().min(1),rights:z.string().min(1),width:z.number().int().positive(),height:z.number().int().positive()}).nullable(),
 sameAs:z.array(z.url())});
neonConfig.webSocketConstructor=WebSocket;

// Runs only with the migration owner connection, and never against the isolated QA database or in QA mode.
const owner=process.env.DATABASE_URL_UNPOOLED;
if(!owner) throw new Error('DATABASE_URL_UNPOOLED must hold the production migration owner connection');
if(process.env.SEO_QA_MODE==='true') throw new Error('Refusing to provision production while SEO_QA_MODE is true');
if(new URL(owner).hostname.startsWith(site.qa.database.hostPrefix)) throw new Error('Refusing to provision production against the configured QA database');

const pool=new Pool({connectionString:owner,connectionTimeoutMillis:20000});
try {
 await migrate(drizzle(pool),{migrationsFolder:'drizzle'});
 const journal=JSON.parse(await readFile('drizzle/meta/_journal.json','utf8')) as {entries:unknown[]};
 const applied=await pool.query('select count(*)::int as count from drizzle.__drizzle_migrations');
 if(applied.rows[0]?.count!==journal.entries.length) throw new Error('Applied migration count does not match the journal');
 // Passwords are generated hex values; the role identifiers are fixed and never taken from input.
 const readerPassword=randomBytes(32).toString('hex'),editorPassword=randomBytes(32).toString('hex');
 await pool.query(`ALTER ROLE seo_public_reader LOGIN PASSWORD '${readerPassword}'`);
 await pool.query(`ALTER ROLE seo_editor_service LOGIN PASSWORD '${editorPassword}'`);
 const db=neon(owner);
 await db`insert into editorial.sites(id,reserved_routes) values(${site.id},${[...site.routes.reserved]}) on conflict(id) do update set reserved_routes=excluded.reserved_routes`;
 await db`insert into editorial.locales values(${site.id},${site.locale}) on conflict do nothing`;
 // Categories are editorial data, so they are provisioned from a reviewable file and held to the same SEO contract as every rendered page.
 const categories=z.array(categorySchema).parse(JSON.parse(await readFile('content/categories.json','utf8')));
 if(!categories.length) throw new Error('At least one category is required before a production build');
 for(const category of categories){
  if(!isPublicSlug(category.slug)) throw new Error(`Invalid category slug: ${category.slug}`);
  if(site.routes.reserved.some(route=>route===category.slug)) throw new Error(`Category slug collides with a reserved route: ${category.slug}`);
  if(/TODO:|\bQA:/.test(JSON.stringify(category))) throw new Error(`Category still holds placeholder text: ${category.slug}`);
  validateSeoCopy(category.seo);
  await db`insert into editorial.categories(site_id,locale,slug,name,introduction,seo) values(${site.id},${site.locale},${category.slug},${category.name},${category.introduction},${JSON.stringify(category.seo)}::jsonb) on conflict(site_id,locale,slug) do update set name=excluded.name,introduction=excluded.introduction,seo=excluded.seo`;
 }
 // The author is registered even while the portrait and profile link are missing, so the launch gate reports the real gap instead of a missing record.
 const author=authorSchema.parse(JSON.parse(await readFile('content/author.json','utf8')));
 if(!isPublicSlug(author.slug)) throw new Error(`Invalid author slug: ${author.slug}`);
 if(/TODO:|\bQA:/.test(JSON.stringify(author))) throw new Error('Author record still holds placeholder text');
 await db`insert into editorial.authors(site_id,slug,name,bio,image,expertise,same_as,is_test) values(${site.id},${author.slug},${author.name},${author.bio},${author.image?JSON.stringify(author.image):null}::jsonb,${author.expertise},${author.sameAs},false) on conflict(site_id,slug) do update set name=excluded.name,bio=excluded.bio,image=excluded.image,expertise=excluded.expertise,same_as=excluded.same_as`;
 const pending=[!author.image?'portrait':null,author.sameAs.length?null:'sameAs'].filter(Boolean);
 if(pending.length) console.log(`PENDING: Author ${author.slug} is registered but still missing ${pending.join(' and ')}; publishing stays blocked until the publisher supplies them.`);
 const connection=(role:string,password:string)=>{const url=new URL(owner);url.username=role;url.password=password;url.search='';return url.href;};
 const env={DATABASE_URL:connection('seo_public_reader',readerPassword),EDITOR_DATABASE_URL:connection('seo_editor_service',editorPassword)};
 await writeFile('.env.production.local',Object.entries(env).map(([key,value])=>`${key}=${value}`).join('\n')+'\n',{mode:0o600});
 await chmod('.env.production.local',0o600);
 // Each restricted role must reach the public contract without the owner connection.
 await neon(env.DATABASE_URL)`select 1 from editorial.published_articles limit 1`;
 await neon(env.EDITOR_DATABASE_URL)`select 1 from editorial.principals limit 1`;
 console.log(`PASS: Provisioned ${journal.entries.length} migrations, both restricted roles, the site row, ${categories.length} categories and the author record on ${new URL(owner).hostname}.`);
 console.log('PASS: Connection strings written to .env.production.local with owner-only permissions; they are never printed.');
} finally { await pool.end(); }
