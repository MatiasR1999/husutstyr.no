import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
if(process.argv.includes('--budget-only')) {
 const child=spawn(process.execPath,['--import','tsx','scripts/phase7/budget-test.ts'],{env:process.env,stdio:'inherit'});
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});
 process.exit(code??1);
}
await mkdir('docs/qa/phase7',{recursive:true});
const runtime={...process.env,...parseEnv(await readFile('.env.phase3.local','utf8')),DATABASE_URL_UNPOOLED:'',NETWORK_LINKS_ENABLED:'false',QA_EVIDENCE_DIR:'docs/qa/phase7',NODE_OPTIONS:'--dns-result-order=ipv4first'};
const owner=parseEnv(await readFile('.env.test.local','utf8')),checks=[];
const ownerRuntime={...runtime,DATABASE_URL_UNPOOLED:owner.DATABASE_URL_UNPOOLED,NEON_BRANCH:owner.NEON_BRANCH};
async function run(label,command,args,env=runtime,allowBudgetFailure=false){
 const started=new Date().toISOString(),child=spawn(command,args,{env,stdio:['ignore','pipe','pipe']});let output='';
 child.stdout.on('data',chunk=>{output+=chunk;process.stdout.write(chunk);});child.stderr.on('data',chunk=>{output+=chunk;process.stderr.write(chunk);});
 const exitCode=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});
 await writeFile(`docs/qa/phase7/${label}.log`,output);checks.push({label,command:[command,...args].join(' '),started,exitCode});
 await writeFile('docs/qa/phase7/checks.json',JSON.stringify({checkedAt:new Date().toISOString(),completeRun:false,checks},null,2)+'\n');
 if(exitCode!==0&&!allowBudgetFailure)process.exit(exitCode??1);
}
await run('clean-install',process.execPath,['scripts/phase7/clean-install.mjs']);
await run('launch-refusal',process.execPath,['scripts/phase7/launch-test.mjs']);
await run('recovery',process.execPath,['--import','tsx','scripts/phase7/recovery.ts'],ownerRuntime);
await run('seed',process.execPath,['--import','tsx','scripts/phase7/seed.ts'],ownerRuntime);
for(const variant of ['1','3','2']){
 const env={...runtime,QA_LAYOUT_VARIANT:variant};
 await run(`build-${variant}`,'npm',['run','build'],env);
 await run(`http-${variant}`,process.execPath,['--import','tsx','scripts/phase4/http-test.ts'],env);
 await run(`performance-${variant}`,process.execPath,['--import','tsx','scripts/phase7/performance.ts'],env,true);
}
await run('publication',process.execPath,['--import','tsx','scripts/phase3/http-test.ts'],ownerRuntime);
await run('auth',process.execPath,['--import','tsx','scripts/phase2/http-test.ts']);
await run('trust-publication',process.execPath,['--import','tsx','scripts/phase4/publication-test.ts'],ownerRuntime);
await run('providers',process.execPath,['--import','tsx','scripts/phase5/providers.ts']);
await run('affiliate',process.execPath,['--import','tsx','scripts/phase5/affiliate-test.ts'],ownerRuntime);
await run('consent',process.execPath,['--import','tsx','scripts/phase5/consent-test.ts']);
await run('metrics',process.execPath,['--import','tsx','scripts/phase5/metrics-test.ts'],ownerRuntime);
await run('network-seed',process.execPath,['--import','tsx','scripts/phase6/seed.ts'],ownerRuntime);
await run('network',process.execPath,['--import','tsx','scripts/phase6/http-test.ts'],ownerRuntime);
await run('database-contract',process.execPath,['--import','tsx','scripts/phase2/database-test.ts'],ownerRuntime);
await run('indexability-contract',process.execPath,['--conditions=react-server','--import','tsx','scripts/phase4/data-test.ts'],ownerRuntime);
await run('html','npm',['run','qa:html']);
await run('page-matrix',process.execPath,['--import','tsx','scripts/phase7/page-matrix.ts']);
await run('secrets',process.execPath,['scripts/phase7/secrets-test.mjs']);
await run('budget-assessment',process.execPath,['--import','tsx','scripts/phase7/budget-test.ts'],runtime,true);
const failed=checks.filter(check=>check.exitCode!==0);
await writeFile('docs/qa/phase7/checks.json',JSON.stringify({checkedAt:new Date().toISOString(),completeRun:true,checks,status:failed.length?'BLOCKED':'PASS',deliveredFlag:'false',externalVercelPreview:'NOT_RUN',fieldCWV:'NOT_RUN'},null,2)+'\n');
if(failed.length){console.error('BLOCKED: Phase 7 checks failed; inspect recorded exit codes and performance reports.');process.exitCode=1;}else console.log('PASS: Local phase 7 checks; inspect external launch gates separately.');
