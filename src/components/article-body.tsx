import site from '@site';
import Image from 'next/image';
import type { ContentBlock } from '@/lib/domain/content';
import {publishedAffiliateLinks} from '@/lib/affiliate';
import {publishedNetworkLinks} from '@/lib/network/repository';
import {NetworkParagraph} from './network-paragraph';
import {AffiliateLink} from './affiliate-link';
import {Diagram} from './diagrams';
export async function ArticleBody({blocks,articleId,revisionId}:{blocks:readonly ContentBlock[];articleId:string;revisionId?:string}) {
  const network=revisionId?await publishedNetworkLinks(articleId,revisionId,blocks):[];
  const links=blocks.some(block=>block.type==='affiliate')?await publishedAffiliateLinks():[];
  return <>{blocks.map((block,index)=>{
    switch(block.type) {
      case 'paragraph':return <NetworkParagraph key={index} text={block.text} links={network.filter(link=>link.blockIndex===index)} />;
      case 'heading':return <h3 key={index}>{block.text}</h3>;
      case 'list':return <ul key={index}>{block.items.map((item,i)=><li key={i}>{item}</li>)}</ul>;
      case 'image':return <figure key={index}><Image src={block.image.url} alt={block.image.alt} width={block.image.width} height={block.image.height} sizes={site.media.sizes} preload={block.preload===true} /><figcaption>{block.image.rights}</figcaption></figure>;
      case 'diagram':return <Diagram key={index} diagramKey={block.key} caption={block.caption} />;
      case 'affiliate':{const link=links.find(link=>link.id===block.linkId);return link?<AffiliateLink key={index} link={link} label={block.label} articleId={articleId} position={index} />:<p key={index}>{block.label}</p>;}
    }
  })}</>;
}
