import 'server-only';
import {after} from 'next/server';
import {setTimeout as delay} from 'node:timers/promises';
import {timingSafeEqual} from 'node:crypto';
import {readRuntimeConfig} from '@/lib/config';
import {verifyDelivery} from '@/lib/seo/delivery-verification';
import {notifyIndexNow} from '@/lib/seo/indexnow';
import {routeDisposition} from '@/lib/public-data';
import {claimJob,finishJob,invalidatePublication,type PublicationJob} from './publication';
export function workerAuthorized(request:Request) {const key=process.env.PUBLICATION_WORKER_SECRET,supplied=request.headers.get('authorization');if(!key||key.length<32||!supplied) return false;const expected=`Bearer ${key}`;return Buffer.byteLength(supplied)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(supplied),Buffer.from(expected));}
async function verifyJob(job:PublicationJob) {
 const runtime=readRuntimeConfig(process.env);let cache:'pending'|'confirmed'=job.cache_state==='confirmed'?'confirmed':'pending';let notification=job.notification_state,error:string|null=null,retry=0;
 try {
  await verifyDelivery(runtime,job);cache='confirmed';
  if(notification==='pending') {
   const state=await routeDisposition(job.snapshot.path);
   const result=await notifyIndexNow(runtime,job.snapshot.path,{key:process.env.INDEXNOW_KEY,published:state?.status===200,isTest:job.snapshot.isTest});
   notification=result.state;error=result.reason;retry=result.delay;
  }
 } catch(cause) {error=cause instanceof Error&&/^[a-z_]+$/.test(cause.message)?cause.message:'delivery_verification_failed';retry=Math.min(3600,2**Math.min(job.attempts,11));}
 const recorded=await finishJob(job,cache,notification,error,retry);
 // Short automatic retries use a new request so the previous invalidation is committed.
 if(recorded&&retry>0&&retry<=8&&job.attempts<3&&process.env.PUBLICATION_WORKER_SECRET) {
  await delay(retry*1000);
  await fetch(new URL('/api/publication-jobs',runtime.identity.url),{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.PUBLICATION_WORKER_SECRET}`},body:JSON.stringify({eventId:job.event_id}),redirect:'error',signal:AbortSignal.timeout(10000)}).catch(()=>undefined);
 }
}
export async function queueDelivery(id:string) {
 const job=await claimJob(id);if(!job) return;
 try {invalidatePublication(job.snapshot);}catch {await finishJob(job,'pending',job.notification_state,'cache_invalidation_failed',2);return;}
 after(()=>verifyJob(job));
}
