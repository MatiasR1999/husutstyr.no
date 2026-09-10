import { z } from 'zod';
import site from '@site';
import { validateSeoCopy } from '@/lib/seo/metadata';

export const webUrl = z.url().refine(value => ['https:', 'http:'].includes(new URL(value).protocol));
export const sourceSchema = z.strictObject({ url: webUrl, title: z.string().trim().min(1), checkedAt: z.iso.datetime() });
export const imageSchema = z.strictObject({ assetId: z.uuid(), url: webUrl, alt: z.string().trim().min(1), width: z.number().int().positive(), height: z.number().int().positive(), rights: z.string().trim().min(1) });
export const researchSchema = z.strictObject({ method: z.string().trim().min(30), responsibleAuthorId: z.uuid(), performedAt: z.iso.datetime(), evidence: z.array(z.strictObject({ assetId: z.uuid().optional(), url: webUrl.optional(), description: z.string().trim().min(1) }).refine(value => Boolean(value.assetId || value.url))).min(1) });
export const blockSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('paragraph'), text: z.string().trim().min(1).max(20000) }),
  z.strictObject({ type: z.literal('heading'), text: z.string().trim().min(1).max(200) }),
  z.strictObject({ type: z.literal('list'), items: z.array(z.string().trim().min(1)).min(1).max(100) }),
  z.strictObject({ type: z.literal('image'), image: imageSchema, preload: z.boolean().optional() }),
  z.strictObject({ type: z.literal('affiliate'), linkId:z.uuid(), label:z.string().trim().min(1).max(200) }),
]);
const common = {
  version: z.literal(1), title: z.string().trim().min(1).max(200), summary: z.string().trim().min(1).max(1000),
  section: z.strictObject({ id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), title: z.string().trim().min(1).max(200) }),
  blocks: z.array(blockSchema).min(1).max(100).refine(blocks=>blocks.filter(block=>block.type==='image'&&block.preload).length<=1,'Only the measured LCP image may be preloaded'),
  seo: z.strictObject({ title: z.string(), description: z.string() }).superRefine((value, ctx) => { try { validateSeoCopy(value); } catch { ctx.addIssue({ code: 'custom', message: 'Invalid editorial metadata' }); } }),
  sources: z.array(sourceSchema).max(100), research: z.array(researchSchema).max(20), topicIds: z.array(z.uuid()).max(50),
};
export const contentSchema = z.discriminatedUnion('kind', [
  z.strictObject({ ...common, kind: z.literal('article') }),
  z.strictObject({ ...common, kind: z.literal('page'), page: z.strictObject({ slug: z.enum(site.trustPages.map(page => page.slug)) }) }),
  z.strictObject({ ...common, kind: z.literal('news'), news: z.strictObject({ dateline: z.string().trim().min(1), occurredAt: z.iso.datetime() }) }),
  z.strictObject({ ...common, kind: z.literal('review'), review: z.strictObject({ productId: z.uuid(), rating: z.number().min(site.editorial.ratingMin).max(site.editorial.ratingMax).optional(), paid: z.boolean(), method: z.string().trim().min(30) }) }),
]);
export type ArticleContent = z.infer<typeof contentSchema>;
export type ContentBlock = z.infer<typeof blockSchema>;

export const authorSnapshotSchema = z.object({ id: z.uuid(), name: z.string(), slug: z.string(), bio: z.string(), is_test: z.boolean(), image: z.object({url:webUrl,alt:z.string(),rights:z.string(),width:z.number().positive(),height:z.number().positive()}).nullable().optional(), expertise:z.array(z.string()).optional(), sameAs:z.array(webUrl).optional() });
export function parseContent(value: unknown): ArticleContent { return contentSchema.parse(value); }

export const priceInputSchema=z.strictObject({productId:z.uuid(),amount:z.string().regex(/^\d{1,12}(\.\d{1,2})?$/),currency:z.string().regex(/^[A-Z]{3}$/),source:webUrl,checkedAt:z.iso.datetime()});
export function priceRecord(value:unknown) {const price=priceInputSchema.parse(value);return {...price,validUntil:new Date(Date.parse(price.checkedAt)+site.editorial.priceValidityHours*3600000).toISOString()};}

export const reviewSnapshotSchema=z.object({id:z.uuid(),name:z.string().min(1),manufacturer:z.string().nullable(),identifier:z.string().nullable(),owned:z.boolean(),price:z.object({amount:z.string().regex(/^\d+(\.\d{1,2})?$/),currency:z.string().regex(/^[A-Z]{3}$/),source:webUrl,checkedAt:z.coerce.date().transform(v=>v.toISOString()),validUntil:z.coerce.date().transform(v=>v.toISOString())}).nullable()});
export type ReviewSnapshot=z.infer<typeof reviewSnapshotSchema>;
export function currentPrice(review:ReviewSnapshot|null|undefined,now=Date.now()) {
 const price=review?.price;
 if(!price||Date.parse(price.checkedAt)>now||Date.parse(price.validUntil)<=now||Date.parse(price.validUntil)>Date.parse(price.checkedAt)+site.editorial.priceValidityHours*3600000) return null;
 return price;
}
