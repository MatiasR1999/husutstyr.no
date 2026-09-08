import type {ReactNode} from 'react';
import type {NetworkLink} from '@/lib/network/policy';
import {networkRel} from '@/lib/seo/network';
export function NetworkParagraph({text,links}:{text:string;links:readonly NetworkLink[]}) {
 const sorted=links.map(link=>({...link,start:text.indexOf(link.anchor)})).toSorted((a,b)=>a.start-b.start);
 let end=0;const content:ReactNode[]=[];
 for(const link of sorted){if(link.start<end)throw new Error('Overlapping network anchors');content.push(text.slice(end,link.start),<a key={link.id} href={link.destination} rel={networkRel} data-network-link>{link.anchor}</a>);end=link.start+link.anchor.length;}
 content.push(text.slice(end));return <p>{content}</p>;
}
