import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {neon,Pool,neonConfig} from '@neondatabase/serverless';
import {drizzle} from 'drizzle-orm/neon-serverless';
import {migrate} from 'drizzle-orm/neon-serverless/migrator';
import {qaConnection} from '../phase2/guard';
import site from '../../site.config';
const exec=promisify(execFile),project=site.qa.database.projectId,parent=site.qa.database.branchId,name=`phase-7-recovery-${Date.now()}`;
const source=new URL(qaConnection());neonConfig.webSocketConstructor=WebSocket;
await mkdir('docs/qa/phase7',{recursive:true});
async function cli(args:string[]){try{return (await exec('neon',[...args,'--project-id',project,'--no-color','--output','json'],{maxBuffer:2000000})).stdout;}catch{throw new Error(`Neon operation failed: ${args[0]} ${args[1]}`);}}
const report:Record<string,unknown>={startedAt:new Date().toISOString(),parent,productionChanged:false};
let id:string|undefined;
try {
 const raw=JSON.parse(await cli(['branches','create','--parent',parent,'--name',name,'--expires-at',new Date(Date.now()+6*3600000).toISOString(),'--cu','0.25','--no-secrets'])) as {branch?:{id:string;parent_id:string};id?:string;parent_id?:string};
 const branch=raw.branch??raw;id=branch.id;assert.ok(id&&id!==parent);assert.equal(branch.parent_id,parent);report.branchId=id;
 await writeFile('work/phase7-recovery-target.json',JSON.stringify({project,parent,id,name})+'\n');
 async function connection(role:string){const text=await cli(['connection-string',id!,'--role-name',role,'--database-name',decodeURIComponent(source.pathname.slice(1))]);const parsed:unknown=text.trim().startsWith('postgres')?text.trim():JSON.parse(text);const result=typeof parsed==='string'?parsed:(parsed as {connection_string?:string}).connection_string;assert.ok(result);const url=new URL(result);assert.notEqual(url.hostname,source.hostname);return result;}
 const ownerUrl=await connection(decodeURIComponent(source.username)),db=neon(ownerUrl);
 const before=await db`select id,revision_id,content_hash from editorial.published_articles order by id`;
 await db`create table public.phase7_restore_probe(value text not null)`;await db`insert into public.phase7_restore_probe values('isolated-restore-check')`;
 await cli(['branches','restore',id,parent]);
 const after=await db`select id,revision_id,content_hash from editorial.published_articles order by id`;
 assert.deepEqual(after,before);const [probe]=await db`select to_regclass('public.phase7_restore_probe') as probe`;assert.equal(probe!.probe,null);
 report.recovery={status:'PASS',publishedRevisionHashesPreserved:before.length,postSnapshotChangeRemoved:true,method:'Restore disposable child from its QA parent; no production restore'};
 const reader=neon(await connection('seo_public_reader')),service=neon(await connection('seo_editor_service'));
 await reader`select count(*) from editorial.published_articles`;
 await assert.rejects(()=>reader`select * from editorial.approvals limit 1`);
 await assert.rejects(()=>reader`update editorial.articles set status='published' where false`);
 await assert.rejects(()=>service`update editorial.articles set status='published' where false`);
 await assert.rejects(()=>service`update editorial.approvals set approved_at=now() where false`);
 report.roles={status:'PASS',readerViewsOnly:true,readerAndServiceDirectPublicationWritesDenied:true};
 // A new database inside this disposable child proves all migrations, independently of the upgraded parent.
 await db`create database phase7_empty_qa`;
 const empty=new URL(ownerUrl);empty.pathname='/phase7_empty_qa';
 const pool=new Pool({connectionString:empty.href,connectionTimeoutMillis:20000});
 try {
  const orm=drizzle(pool),journal=JSON.parse(await readFile('drizzle/meta/_journal.json','utf8'));
  await mkdir('work/phase7-baseline/meta',{recursive:true});await copyFile('drizzle/0000_editorial_model.sql','work/phase7-baseline/0000_editorial_model.sql');
  await writeFile('work/phase7-baseline/meta/_journal.json',JSON.stringify({...journal,entries:journal.entries.slice(0,1)}));
  await migrate(orm,{migrationsFolder:'work/phase7-baseline'});
  await pool.query("insert into editorial.sites(id,reserved_routes) values('migration-sentinel',ARRAY[]::text[])");
  await migrate(orm,{migrationsFolder:'drizzle'});await migrate(orm,{migrationsFolder:'drizzle'});
  assert.equal((await pool.query("select count(*)::int as n from editorial.sites where id='migration-sentinel'")).rows[0]?.n,1);
  assert.equal((await pool.query('select count(*)::int as n from drizzle.__drizzle_migrations')).rows[0]?.n,journal.entries.length);
  report.migrations={status:'PASS',emptyBaseline:true,migrations:journal.entries.length,upgradePreservesSentinel:true,idempotentRerun:true};
 }finally{await pool.end();}
 report.status='PASS';
}catch(error){report.status='BLOCKED';report.error=error instanceof Error?error.message:'Recovery failed';throw error;}
finally {
 if(id){try{await cli(['branches','delete',id]);const remaining=JSON.parse(await cli(['branches','list'])) as {id:string}[];assert.ok(!remaining.some(branch=>branch.id===id));report.disposableBranchDeleted=true;}catch{report.disposableBranchDeleted=false;report.expiresWithinHours=6;}}
 report.checkedAt=new Date().toISOString();await writeFile('docs/qa/phase7/recovery.json',JSON.stringify(report,null,2)+'\n');
}
console.log('PASS: Disposable QA recovery, restored role boundaries and empty-database migration rerun.');
