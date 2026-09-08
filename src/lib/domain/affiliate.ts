import {z} from 'zod';

export function affiliateDestination(value:string,origins:readonly string[]):URL {
 const url=new URL(value);
 if(value!==value.trim()||/[\r\n\\]/.test(value)||!['https:','http:'].includes(url.protocol)||url.username||url.password||url.hash||!origins.includes(url.origin))throw new Error('Unregistered affiliate destination');
 return url;
}
export const affiliateInput=z.strictObject({slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),destination:z.url(),relationship:z.enum(['commission','owned']),disclosure:z.string().trim().min(1).max(1000),productId:z.uuid().nullable().default(null)});
export const affiliateRecord=z.object({id:z.uuid(),slug:z.string(),destination:z.url(),relationship:z.enum(['commission','owned']),disclosure:z.string()});
export type AffiliateRecord=z.infer<typeof affiliateRecord>;
export function affiliateEvent(link:AffiliateRecord,articleId:string,position:number) {
 return {linkId:link.id,articleId:z.uuid().parse(articleId),destination:new URL(link.destination).origin,placement:`body-${position}`};
}
