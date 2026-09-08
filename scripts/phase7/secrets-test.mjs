import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {join} from 'node:path';
const secrets=new Map();
for(const file of ['.env.local','.env.test.local','.env.phase3.local']){
 const env=parseEnv(await readFile(file,'utf8'));
 for(const [key,value] of Object.entries(env))if(value.length>=16&&(/SECRET/.test(key)||/DATABASE_URL/.test(key))){secrets.set(value,key);if(/DATABASE_URL/.test(key)){const password=decodeURIComponent(new URL(value).password);if(password.length>=12)secrets.set(password,`${key}:password`);}}
}
assert.ok(secrets.size>0);
const paths=['site.config.ts','package.json','package-lock.json','next.config.ts'];
for(const root of ['src','drizzle','.next/static','docs/qa/phase7'])for(const entry of await readdir(root,{recursive:true,withFileTypes:true}))if(entry.isFile())paths.push(join(entry.parentPath,entry.name));
const findings=[];
for(const path of paths){const bytes=await readFile(path);for(const [secret,key] of secrets)if(bytes.includes(Buffer.from(secret)))findings.push({path,key});}
await writeFile('docs/qa/phase7/secrets.json',JSON.stringify({checkedAt:new Date().toISOString(),files:paths.length,secretPatterns:secrets.size,findings,status:findings.length?'BLOCKED':'PASS',scope:'Configured database credentials and private runtime secrets in source, migrations, browser assets and phase7 evidence; values are never reported'},null,2)+'\n');
assert.deepEqual(findings,[]);console.log(`PASS: ${paths.length} files contain none of the configured private credentials.`);
