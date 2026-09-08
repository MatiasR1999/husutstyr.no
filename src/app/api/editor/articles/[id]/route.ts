import { z } from 'zod';
import { currentSession } from '@/lib/auth/session';
import { checkOrigin,privateError,privateRedirect } from '@/lib/auth/http';
import { documents,saveRevision,reviewRevision } from '@/lib/editorial/repository';
import { contentSchema } from '@/lib/domain/content';
const command=z.discriminatedUnion('action',[z.strictObject({action:z.literal('save'),revisionId:z.uuid(),content:contentSchema}),z.strictObject({action:z.enum(['submit','approve']),revisionId:z.uuid()})]);
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
 try {
  checkOrigin(request);const session=await currentSession();if(!session) return privateError();const {id}=await params;
  let raw:unknown;
  if(request.headers.get('content-type')?.includes('application/json')) raw=await request.json();
  else {
   const fields=Object.fromEntries(await request.formData());
   if(fields.action==='save') {
    const input=z.strictObject({action:z.literal('save'),revisionId:z.uuid(),title:z.string(),summary:z.string(),body:z.string(),seoTitle:z.string(),description:z.string()}).parse(fields);
    const current=(await documents(session.hash)).find(row=>row.id===id);if(!current || !current.payload.blocks.every(block=>block.type==='paragraph')) return privateError();
    raw={action:input.action,revisionId:input.revisionId,content:{...current.payload,title:input.title,summary:input.summary,seo:{title:input.seoTitle,description:input.description},blocks:input.body.split(/\r?\n\s*\r?\n/).map(text=>({type:'paragraph',text}))}};
   } else raw=fields;
  }
  const input=command.parse(raw);
  if(input.action==='save') await saveRevision(session.hash,id,input.revisionId,input.content);
  else await reviewRevision(session.hash,id,input.revisionId,input.action);
  return privateRedirect(`/redaksjon/artikler/${id}`);
 } catch {return privateError();}
}
