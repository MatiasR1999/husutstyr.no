import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
// Every launch secret is blanked explicitly, so refusal is proven by the gate itself and never by whatever the ambient environment happens to hold.
const env={...process.env,SEO_QA_MODE:'false',OIDC_TEST_MODE:'false',NETWORK_LINKS_ENABLED:'false',VERCEL:'1',VERCEL_ENV:'production',DATABASE_URL_UNPOOLED:'',SITE_URL:'',OIDC_CLIENT_ID:'',OIDC_CLIENT_SECRET:'',PUBLICATION_WORKER_SECRET:'',INDEXNOW_KEY:''};
const child=spawn('npm',['run','build'],{env,stdio:['ignore','pipe','pipe']});let output='';
child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{output+=chunk;});
const exitCode=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});
assert.notEqual(exitCode,0);
for(const marker of ['invalid-production-origin','missing-secret:OIDC_CLIENT_ID','missing-secret:OIDC_CLIENT_SECRET','missing-secret:PUBLICATION_WORKER_SECRET','missing-secret:INDEXNOW_KEY'])assert.match(output,new RegExp(`BLOCKED: ${marker.replace(':','\\:')}`));
assert.doesNotMatch(output,/Creating an optimized production build/);
await mkdir('docs/qa/phase7',{recursive:true});
await writeFile('docs/qa/phase7/launch-refusal.log',output);
await writeFile('docs/qa/phase7/launch-refusal.json',JSON.stringify({checkedAt:new Date().toISOString(),command:'npm run build',exitCode,status:'PASS',meaning:'A production build with incomplete runtime configuration refuses before compilation; refusal is expected, not a successful production deployment'},null,2)+'\n');
console.log('PASS: Incomplete runtime configuration rejected before production compilation.');
