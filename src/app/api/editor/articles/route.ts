import { z } from 'zod';
import site from '@site';
import { currentSession } from '@/lib/auth/session';
import { checkOrigin,privateError,privateRedirect } from '@/lib/auth/http';
import { createArticle } from '@/lib/editorial/repository';
import { contentSchema } from '@/lib/domain/content';
const form=z.strictObject({categoryId:z.uuid(),title:z.string(),summary:z.string(),body:z.string(),seoTitle:z.string(),description:z.string()});
export async function POST(request:Request) {
 try {
  checkOrigin(request);const session=await currentSession();if(!session) return privateError();let raw:unknown;
  if(request.headers.get('content-type')?.includes('application/json')) raw=await request.json();
  else {const fields=form.parse(Object.fromEntries(await request.formData()));raw={categoryId:fields.categoryId,content:{version:1,kind:'article',title:fields.title,summary:fields.summary,section:{id:'innhold',title:site.editorial.ui.section},blocks:fields.body.split(/\r?\n\s*\r?\n/).map(text=>({type:'paragraph',text})),seo:{title:fields.seoTitle,description:fields.description},sources:[],research:[],topicIds:[]}};}
  const input=z.strictObject({categoryId:z.uuid(),content:contentSchema}).parse(raw);const id=await createArticle(session.hash,input.categoryId,input.content);return privateRedirect(`/redaksjon/artikler/${id}`);
 } catch {return privateError();}
}
