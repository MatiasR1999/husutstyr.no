import {spawn} from 'node:child_process';
import {readFile,cp,mkdir,mkdtemp,writeFile,readdir,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const evidence=resolve('docs/qa/phase7');await mkdir(evidence,{recursive:true});await mkdir('work',{recursive:true});
const directory=await mkdtemp(resolve('work/phase7-clean-'));
const roots=['src','scripts','tests','drizzle','docs/seo-template-spec.md','docs/seo-template-plan.md','package.json','package-lock.json','site.config.ts','next.config.ts','tsconfig.json','next-env.d.ts','eslint.config.mjs','postcss.config.mjs','vitest.config.ts','AGENTS.md'];
for(const path of roots)await cp(path,join(directory,path),{recursive:true});
const files=[];
for(const path of roots){const names=(await stat(path)).isFile()?[path]:(await readdir(path,{recursive:true,withFileTypes:true})).filter(entry=>entry.isFile()).map(entry=>join(entry.parentPath,entry.name));for(const name of names)files.push({path:name,sha256:createHash('sha256').update(await readFile(name)).digest('hex')});}
const checks=[],runtime={...process.env,DATABASE_URL_UNPOOLED:'',npm_config_cache:'/private/tmp/seo-template-npm-cache'};
for(const args of [['ci'],['run','build'],['run','typecheck'],['run','lint'],['test']]){
 const label=args.join('-'),startedAt=new Date().toISOString(),child=spawn('npm',args,{cwd:directory,env:runtime,stdio:['ignore','pipe','pipe']});let output='';
 child.stdout.on('data',chunk=>{output+=chunk;process.stdout.write(chunk);});child.stderr.on('data',chunk=>{output+=chunk;process.stderr.write(chunk);});
 const exitCode=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve)});
 await writeFile(`${evidence}/clean-${label}.log`,output);checks.push({command:`npm ${args.join(' ')}`,startedAt,exitCode});
 await writeFile(`${evidence}/clean-install.json`,JSON.stringify({checkedAt:new Date().toISOString(),directory,files,checks,passed:checks.length===5&&checks.every(check=>check.exitCode===0),secretsCopied:false},null,2)+'\n');
 if(exitCode!==0){process.exitCode=exitCode??1;break;}
}
