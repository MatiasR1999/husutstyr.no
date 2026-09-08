import 'server-only';
import {sql} from 'drizzle-orm';
import site from '@site';
import {publicDatabase} from '../public-data';
import {readRuntimeConfig} from '../config';
import type {ContentBlock} from '../domain/content';
import {networkRegistry} from './config';
import {networkRecord,networkWhenEnabled,validatePlacement,type NetworkLink} from './policy';
export async function publishedNetworkLinks(articleId:string,revisionId:string,blocks:readonly ContentBlock[]):Promise<readonly NetworkLink[]> {
 const runtime=readRuntimeConfig(process.env);
 return networkWhenEnabled(runtime.networkLinks,async()=>{
  const registry=networkRegistry();if(!registry)return [];
  const result=await publicDatabase().execute(sql`select id,article_id as "articleId",revision_id as "revisionId",block_index as "blockIndex",anchor,peer_id as "peerId",destination,topic_slug as "topicSlug",registry_version as "registryVersion" from editorial.public_network_links where site_id=${site.id} and is_test=${runtime.qa} and article_id=${articleId} and revision_id=${revisionId} and registry_version=${registry.version} order by block_index,id`);
  const links=result.rows.map(row=>networkRecord.parse(row));
  if(links.length>2)throw new Error('Network link limit exceeded');
  for(const link of links)validatePlacement(link,registry,runtime.qa?site.qa.phase6.niche:site.niche,runtime.identity.url,blocks,[link.topicSlug],runtime.qa);
  return links;
 });
}
