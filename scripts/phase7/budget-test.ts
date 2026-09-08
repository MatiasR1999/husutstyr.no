import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {z} from 'zod';
import {finalTemplateProfile as profile,percentile75} from '../performance-profile';

const metric=z.number().finite().nonnegative();
const sampleSchema=z.object({name:z.enum(['home','article','long-image-article']),mode:z.enum(['cold','warm']),sample:z.number().int().min(1).max(profile.samples),lcp:metric.positive(),cls:metric,ttfb:metric,consentMs:metric,menuMs:metric,contentMs:metric.nullable(),jsGzipBytes:metric.positive()});
const reportSchema=z.object({variant:z.string(),checkedAt:z.iso.datetime(),profile:z.object({viewport:z.object({width:z.number(),height:z.number()}),cpuSlowdown:z.number(),latencyMs:z.number(),downloadBytesPerSecond:z.number(),uploadBytesPerSecond:z.number(),samples:z.number(),limits:z.object({lcpMs:z.number(),cls:z.number(),ttfbMs:z.number(),interactionMs:z.number(),initialJsGzipBytes:z.number()})}),samples:z.array(sampleSchema).length(30)});
const assessedAt=new Date().toISOString(),sources=[],groups=[];
for(const variant of ['1','2','3']) {
 const path=`docs/qa/phase7/variant-${variant}/performance.json`,raw=await readFile(path,'utf8'),report=reportSchema.parse(JSON.parse(raw));
 assert.equal(report.variant,variant);
 const {initialJsGzipBytes:measuredJsLimit,...unchanged}=report.profile.limits;
 const {initialJsGzipBytes:currentJsLimit,...expected}=profile.limits;
 assert.deepEqual(unchanged,expected,'Other approved limits must not change during budget reassessment');
 assert.deepEqual({...report.profile,limits:profile.limits,scope:profile.scope},profile,'The measured lab profile must match');
 sources.push({path,sha256:createHash('sha256').update(raw).digest('hex'),measuredAt:report.checkedAt,measuredJsLimit,currentJsLimit});
 for(const name of ['home','article','long-image-article'] as const)for(const mode of ['cold','warm'] as const){
  const values=report.samples.filter(row=>row.name===name&&row.mode===mode);
  assert.deepEqual(values.map(row=>row.sample).sort((a,b)=>a-b),[1,2,3,4,5]);
  if(name!=='home')assert.ok(values.every(row=>row.contentMs!==null));
  const metrics={lcpMs:percentile75(values.map(row=>row.lcp)),cls:percentile75(values.map(row=>row.cls)),ttfbMs:percentile75(values.map(row=>row.ttfb)),interactionMs:Math.max(...(['consentMs','menuMs','contentMs'] as const).map(key=>percentile75(values.map(row=>row[key]??0)))),initialJsGzipBytes:Math.max(...values.map(row=>row.jsGzipBytes))};
  const failures=(Object.keys(metrics) as (keyof typeof metrics)[]).filter(key=>metrics[key]>profile.limits[key]);
  groups.push({variant,name,mode,samples:values.length,metrics,failures,status:failures.length?'BLOCKED':'PASS'});
 }
}
const failures=groups.filter(group=>group.failures.length),jsPassed=groups.every(group=>group.metrics.initialJsGzipBytes<=profile.limits.initialJsGzipBytes);
await mkdir('docs/qa/phase7',{recursive:true});
await writeFile('docs/qa/phase7/budget.json',JSON.stringify({assessedAt,status:failures.length?'BLOCKED':'PASS',approval:'User approved final-template JS budget 165000 on 2026-09-08; all other limits unchanged',profile,sources,groups,jsPassed,maxInitialJsGzipBytes:Math.max(...groups.map(group=>group.metrics.initialJsGzipBytes)),newMeasurements:false,fieldCWV:'NOT_RUN'},null,2)+'\n');
console.log(`${jsPassed?'PASS':'BLOCKED'}: Initial JavaScript against approved ${profile.limits.initialJsGzipBytes} gzip bytes; original measurement timestamps and source files preserved.`);
for(const group of failures)console.log(`BLOCKED: variant=${group.variant} case=${group.name} cache=${group.mode} budgets=${group.failures.join(',')}`);
if(failures.length)process.exitCode=1;
