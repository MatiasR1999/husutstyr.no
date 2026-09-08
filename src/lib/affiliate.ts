import 'server-only';
import {sql} from 'drizzle-orm';
import {z} from 'zod';
import site from '@site';
import {publicDatabase} from './public-data';
import {readRuntimeConfig} from './config';
import {affiliateDestination,affiliateRecord} from './domain/affiliate';

export function affiliateOrigins():readonly string[] {return readRuntimeConfig(process.env).qa?[site.qa.phase5.destinationOrigin]:site.affiliate.allowedOrigins;}
export async function publishedAffiliateLinks() {
 const rows=await publicDatabase().execute(sql`select id,slug,destination,relationship,disclosure from editorial.public_affiliate_links where site_id=${site.id} and is_test=${readRuntimeConfig(process.env).qa}`);
 return z.array(affiliateRecord).parse(rows.rows).filter(link=>{try{affiliateDestination(link.destination,affiliateOrigins());return true;}catch{return false;}});
}
