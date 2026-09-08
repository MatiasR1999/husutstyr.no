import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
await mkdir('docs/qa/phase3',{recursive:true});
const runtime={...process.env,...parseEnv(await readFile('.env.phase3.local','utf8')),DATABASE_URL_UNPOOLED:'',QA_EVIDENCE_DIR:'docs/qa/phase3',NODE_OPTIONS:'--dns-result-order=ipv4first'};
const owner=parseEnv(await readFile('.env.test.local','utf8'));
const checks=[];
for(const [label,command,args,env] of [
 ['migrate',process.execPath,['--import','tsx','scripts/phase3/migrate.ts'],{...runtime,DATABASE_URL_UNPOOLED:owner.DATABASE_URL_UNPOOLED}],
 ['build','npm',['run','build'],runtime],['typecheck','npm',['run','typecheck'],runtime],['lint','npm',['run','lint'],runtime],['test','npm',['test'],runtime],
 ['html','npm',['run','qa:html'],runtime],['auth',process.execPath,['--import','tsx','scripts/phase2/http-test.ts'],runtime],
 ['publication',process.execPath,['--import','tsx','scripts/phase3/http-test.ts'],{...runtime,DATABASE_URL_UNPOOLED:owner.DATABASE_URL_UNPOOLED}],
]) {
 const started=new Date().toISOString();
 const child=spawn(command,args,{env,stdio:['ignore','pipe','pipe']});let output='';
 child.stdout.on('data',chunk=>{output+=chunk;process.stdout.write(chunk);});child.stderr.on('data',chunk=>{output+=chunk;process.stderr.write(chunk);});
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});
 await writeFile(`docs/qa/phase3/${label}.log`,output);
 checks.push({label,command:[command,...args].join(' '),started,exitCode:code});
 await writeFile('docs/qa/phase3/checks.json',JSON.stringify(checks,null,2)+'\n');
 if(code!==0) process.exit(code??1);
}
