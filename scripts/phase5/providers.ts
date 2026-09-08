import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sources=[
 {name:'analytics',url:'https://va.vercel-scripts.com/v1/script.js'},
 {name:'speed',url:'https://va.vercel-scripts.com/v1/speed-insights/script.js'},
];
await mkdir('work',{recursive:true});
const records=[];
for(const source of sources){
 const response=await fetch(source.url);if(!response.ok)throw new Error(`Provider fetch failed: ${source.name} ${response.status}`);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length<1000||!bytes.toString().includes('beforeSend'))throw new Error('Unexpected provider response');
 await writeFile(`work/vercel-${source.name}-provider.js`,bytes);
 records.push({...source,bytes:bytes.length,sha256:createHash('sha256').update(await readFile(`work/vercel-${source.name}-provider.js`)).digest('hex')});
}
await writeFile(`${process.env.QA_EVIDENCE_DIR??'docs/qa/phase5'}/provider-sources.json`,JSON.stringify({retrievedAt:new Date().toISOString(),records,note:'Public production scripts run unchanged against the loopback collector; fresh source drift is covered by the browser contract test'},null,2)+'\n');
console.log('PASS: Retrieved both public provider scripts with SHA-256 provenance.');
