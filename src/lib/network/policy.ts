import {z} from 'zod';
import type {NetworkRegistry} from '../site-types';
import type {ContentBlock} from '../domain/content';
const slug=z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);
export const registrySchema=z.strictObject({version:z.number().int().positive(),sites:z.array(z.strictObject({id:slug,origin:z.url().refine(value=>new URL(value).protocol==='https:'&&new URL(value).origin===value&&!new URL(value).username&&!new URL(value).password),niche:slug,topics:z.array(slug).min(1).max(50)})).max(100)}).superRefine((value,ctx)=>{
 if(new Set(value.sites.map(peer=>peer.id)).size!==value.sites.length||new Set(value.sites.map(peer=>peer.origin)).size!==value.sites.length)ctx.addIssue({code:'custom',message:'Duplicate network peer'});
});
export const networkInput=z.strictObject({articleId:z.uuid(),revisionId:z.uuid(),blockIndex:z.number().int().min(0).max(99),anchor:z.string().min(3).max(120).refine(value=>!/[\p{C}]/u.test(value)),peerId:slug,destination:z.url(),topicSlug:slug,justification:z.string().trim().min(30).max(2000),placement:z.literal('body'),relationship:z.literal('editorial')});
export const networkRecord=z.object({id:z.uuid(),articleId:z.uuid(),revisionId:z.uuid(),blockIndex:z.number().int(),anchor:z.string(),peerId:z.string(),destination:z.string(),topicSlug:z.string(),registryVersion:z.number().int()});
export type NetworkLink=z.infer<typeof networkRecord>;
export function normalizedAnchor(value:string):string{return value.normalize('NFKC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('nb');}
export function validatePlacement(input:Pick<NetworkLink,'anchor'|'blockIndex'|'peerId'|'destination'|'topicSlug'>,registry:NetworkRegistry,niche:string,origin:string,blocks:readonly ContentBlock[],topicSlugs:readonly string[],qa=false):void {
 const peer=registry.sites.find(peer=>peer.id===input.peerId),url=new URL(input.destination),block=blocks[input.blockIndex];
 if(!peer||peer.niche!==niche||peer.origin===origin||peer.origin!==url.origin||!peer.topics.includes(input.topicSlug)||!topicSlugs.includes(input.topicSlug))throw new Error('Unrelated network destination');
 if((url.protocol!=='https:'&&!(qa&&url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname)))||url.username||url.password||url.search||url.hash||/[\s\\]/u.test(input.destination)||input.destination!==url.href)throw new Error('Invalid network destination');
 if(block?.type!=='paragraph'||block.text.indexOf(input.anchor)<0||block.text.indexOf(input.anchor)!==block.text.lastIndexOf(input.anchor)||!normalizedAnchor(input.anchor))throw new Error('Network links require one exact context in an existing paragraph');
}
export async function networkWhenEnabled<T>(enabled:boolean,read:()=>Promise<readonly T[]>):Promise<readonly T[]>{return enabled?read():[];}
