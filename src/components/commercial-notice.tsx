import site from '@site';
import {publishedAffiliateLinks} from '@/lib/affiliate';
import type {ContentBlock} from '@/lib/domain/content';
export async function CommercialNotice({blocks,paid=false,owned=false}:{blocks:readonly ContentBlock[];paid?:boolean;owned?:boolean}) {
 const ids=blocks.flatMap(block=>block.type==='affiliate'?[block.linkId]:[]);
 const links=ids.length?(await publishedAffiliateLinks()).filter(link=>ids.includes(link.id)):[];
 if(!ids.length&&!paid&&!owned)return null;
 return <aside className="notice commercial-notice" data-commercial-notice>
  {(ids.length>links.length||links.some(link=>link.relationship==='commission'))&&<p>{site.affiliate.disclosure}</p>}
  {links.some(link=>link.relationship==='owned')&&<p>{site.affiliate.ownedDisclosure}</p>}
  {owned&&<p>{site.labels.owned}</p>}
  {paid&&<p>{site.labels.paid}</p>}
 </aside>;
}
