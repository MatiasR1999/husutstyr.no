import 'server-only';
import {sql} from 'drizzle-orm';
import {z} from 'zod';
import site from '@site';
import {editorDb} from './repository';
export const metricsPeriod=z.strictObject({from:z.iso.datetime(),to:z.iso.datetime()}).refine(value=>Date.parse(value.from)<Date.parse(value.to));
const count=z.number().int().nonnegative();
const reportSchema=z.object({asOf:z.iso.datetime({offset:true}),from:z.iso.datetime({offset:true}),to:z.iso.datetime({offset:true}),firstPublishedInPeriod:count,publicationEventsInPeriod:count,currentlyPublished:count,withOriginalResearch:count,originalResearchShare:z.number().min(0).max(1).nullable()});
export async function publicationMetrics(hash:string,period:z.infer<typeof metricsPeriod>) {
 const rows=await editorDb().execute<{report:unknown}>(sql`select editorial.publication_metrics(${hash},${site.locale},${period.from}::timestamptz,${period.to}::timestamptz) as report`);
 return {...reportSchema.parse(rows.rows[0]?.report),basis:{periodBounds:'from-inclusive-to-exclusive',inventory:'published-revisions-at-asOf',research:'documented-research-in-approved-published-revision',excludedKinds:['page']}};
}
