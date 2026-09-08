import {ImageResponse} from 'next/og';
import site from '@site';
import type {PublicPage} from '@/lib/public-pages';
import {readRuntimeConfig} from '@/lib/config';
export function ogImage(page:PublicPage) {
 const runtime=readRuntimeConfig(process.env),{width,height,padding,titleSize,smallSize}=site.og;
 // Fit the complete editorial title; small type remains legible for the 200-character limit.
 const fontSize=page.title.length>140?titleSize*0.62:page.title.length>85?titleSize*0.78:titleSize;
 return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'space-between',padding,background:site.tokens['--color-page'],color:site.tokens['--color-ink']}}>
  <div style={{display:'flex',fontSize:smallSize,color:site.tokens['--color-accent']}}>{runtime.identity.name}</div>
  <div style={{display:'flex',fontSize,lineHeight:1.18,overflowWrap:'anywhere'}}>{page.title}</div>
  <div style={{display:'flex',fontSize:smallSize,color:site.tokens['--color-muted']}}>{'article' in page?page.article.author.name:runtime.identity.name}</div>
 </div>,{width,height,headers:{'Cache-Control':'private, no-store','X-Content-Title':encodeURIComponent(page.title),...('article' in page?{'X-Publication-Hash':page.article.contentHash}:{})}});
}
