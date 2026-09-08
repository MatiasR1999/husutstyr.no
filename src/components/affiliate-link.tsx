import site from '@site';
import {affiliateEvent,type AffiliateRecord} from '@/lib/domain/affiliate';
import {affiliateRel} from '@/lib/seo/affiliate';
export function AffiliateLink({link,label,articleId,position}:{link:AffiliateRecord;label:string;articleId:string;position:number}) {
 const event=affiliateEvent(link,articleId,position);
 return <p className="affiliate-link"><span>{link.relationship==='owned'?site.affiliate.ownedLinkLabel:site.affiliate.linkLabel}: </span><a href={`/go/${link.slug}`} rel={affiliateRel} data-affiliate-id={event.linkId} data-article-id={event.articleId} data-destination={event.destination} data-placement={event.placement}>{label}</a><br /><span className="meta">{link.disclosure}</span></p>;
}
