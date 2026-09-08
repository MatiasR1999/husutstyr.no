import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import budgetPolicy from './phase4/budget-policy.json' with {type:'json'};
await mkdir('docs/qa/phase4',{recursive:true});
async function runFunctionalChecks() {
const runtime={...process.env,...parseEnv(await readFile('.env.phase3.local','utf8')),DATABASE_URL_UNPOOLED:'',QA_EVIDENCE_DIR:'docs/qa/phase4',NODE_OPTIONS:'--dns-result-order=ipv4first'};
const owner=parseEnv(await readFile('.env.test.local','utf8')),checks=[];
async function run(label,command,args,env=runtime) {
 const started=new Date().toISOString(),child=spawn(command,args,{env,stdio:['ignore','pipe','pipe']});let output='';
 child.stdout.on('data',chunk=>{output+=chunk;process.stdout.write(chunk);});child.stderr.on('data',chunk=>{output+=chunk;process.stderr.write(chunk);});
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});
 await writeFile(`docs/qa/phase4/${label}.log`,output);checks.push({label,command:[command,...args].join(' '),started,exitCode:code});await writeFile('docs/qa/phase4/checks.json',JSON.stringify(checks,null,2)+'\n');if(code!==0)process.exit(code??1);
}
await run('migrate',process.execPath,['--import','tsx','scripts/phase4/migrate.ts'],{...runtime,DATABASE_URL_UNPOOLED:owner.DATABASE_URL_UNPOOLED});
await run('data',process.execPath,['--conditions=react-server','--import','tsx','scripts/phase4/data-test.ts'],{...runtime,DATABASE_URL_UNPOOLED:owner.DATABASE_URL_UNPOOLED});
for(const variant of ['1','3','2']) {
 const env={...runtime,QA_LAYOUT_VARIANT:variant};
 await run(`build-${variant}`,'npm',['run','build'],env);
 if(variant==='1') {await run('typecheck','npm',['run','typecheck']);await run('lint','npm',['run','lint']);await run('test','npm',['test']);}
 await run(`http-${variant}`,process.execPath,['--import','tsx','scripts/phase4/http-test.ts'],env);
}
await run('html','npm',['run','qa:html']);
await run('auth',process.execPath,['--import','tsx','scripts/phase2/http-test.ts']);
await run('publication',process.execPath,['--import','tsx','scripts/phase3/http-test.ts'],{...runtime,DATABASE_URL_UNPOOLED:owner.DATABASE_URL_UNPOOLED});
await run('page-publication',process.execPath,['--import','tsx','scripts/phase4/publication-test.ts'],{...runtime,DATABASE_URL_UNPOOLED:owner.DATABASE_URL_UNPOOLED});
}
const budgetOnly=process.argv.includes('--budget-only');
if(!budgetOnly)await runFunctionalChecks();
const measurements=await Promise.all(['1','2','3'].map(async variant=>{
 const report=JSON.parse(await readFile(`docs/qa/phase4/variant-${variant}/report.json`,'utf8'));
 const {externalGzip,inlineGzip,total}=report.javascript;
 if(![externalGzip,inlineGzip,total].every(value=>Number.isSafeInteger(value)&&value>=0)||externalGzip+inlineGzip!==total)throw new Error(`Invalid JavaScript measurement for variant ${variant}`);
 return {...report.javascript,variant,measuredAt:report.checkedAt,phase4Budget:budgetPolicy.phase4GzipBytes,finalTemplateBudget:budgetPolicy.finalTemplateGzipBytes,budgetPassed:total<=budgetPolicy.phase4GzipBytes,finalTemplateBudgetPassed:total<=budgetPolicy.finalTemplateGzipBytes};
}));
await writeFile('docs/qa/phase4/budget.json',JSON.stringify({checkedAt:new Date().toISOString(),mode:budgetOnly?'reassess-saved-measurements':'full-run',approval:budgetPolicy,measurements},null,2)+'\n');
if(measurements.some(result=>!result.budgetPassed)){console.error(`FAIL: Phase 4 JavaScript exceeds its approved ${budgetPolicy.phase4GzipBytes}-byte gzip budget.`);process.exitCode=1;}
else console.log(`PASS: Phase 4 JavaScript is at most ${Math.max(...measurements.map(result=>result.total))} of ${budgetPolicy.phase4GzipBytes} approved gzip bytes. Final-template limit remains ${budgetPolicy.finalTemplateGzipBytes}.`);
