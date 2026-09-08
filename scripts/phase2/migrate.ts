import { Pool,neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { mkdir,readFile,writeFile,copyFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { qaConnection } from './guard';
neonConfig.webSocketConstructor=WebSocket;
const connection=new URL(qaConnection());
if(process.env.MIGRATION_EMPTY_CHECK==='true') connection.pathname='/phase2_migration_qa';
const pool=new Pool({connectionString:connection.href,connectionTimeoutMillis:20000});
try {
 const db=drizzle(pool);
 const existing=await pool.query("select count(*)::int as count from information_schema.tables where table_schema='editorial'");
 const wasEmpty=existing.rows[0]?.count===0;
 if(wasEmpty) {
  const journal=JSON.parse(await readFile('drizzle/meta/_journal.json','utf8'));
  await mkdir('work/migration-baseline/meta',{recursive:true});
  await copyFile('drizzle/0000_editorial_model.sql','work/migration-baseline/0000_editorial_model.sql');
  await writeFile('work/migration-baseline/meta/_journal.json',JSON.stringify({...journal,entries:journal.entries.slice(0,1)}));
  await migrate(db,{migrationsFolder:'work/migration-baseline'});
  await pool.query("insert into editorial.sites(id,reserved_routes) values('migration-sentinel',ARRAY[]::text[])");
 }
 await migrate(db,{migrationsFolder:'drizzle'});
 assert.equal((await pool.query("select count(*)::int as count from editorial.sites where id='migration-sentinel'")).rows[0]?.count,1);
 await migrate(db,{migrationsFolder:'drizzle'});
 const applied=await pool.query('select count(*)::int as count from drizzle.__drizzle_migrations');
 const journal=JSON.parse(await readFile('drizzle/meta/_journal.json','utf8'));
 assert.equal(applied.rows[0]?.count,journal.entries.length);
 const report={checkedAt:new Date().toISOString(),emptyBaseline:wasEmpty,upgradePreservedSentinel:true,idempotentRerun:true,migrations:journal.entries.length,driver:'Drizzle Neon WebSocket transactional migrator'};
 await writeFile(process.env.MIGRATION_EMPTY_CHECK==='true'?'docs/qa/phase2/migrations-empty.json':'docs/qa/phase2/migrations.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
} finally {await pool.end();}
