import {it,expect} from 'vitest';
import site from '../site.config';
import {parseContent} from '../src/lib/domain/content';
it('requires an explicit single measured LCP image and leaves other images lazy',()=>{
 const image={type:'image',image:{assetId:crypto.randomUUID(),url:site.qa.phase7.imageUrl,alt:site.qa.phase7.imageAlt,rights:site.qa.phase7.imageRights,width:1600,height:900}};
 const article={version:1,kind:'article',title:site.qa.article.title,summary:site.qa.article.summary,section:site.qa.article.section,seo:site.qa.article.seo,sources:[],research:[],topicIds:[],blocks:[{...image,preload:true},image]};
 const content=parseContent(article);expect(content.blocks[0]).toHaveProperty('preload',true);expect(content.blocks[1]).not.toHaveProperty('preload');
 expect(()=>parseContent({...article,blocks:[{...image,preload:true},{...image,preload:true}]})).toThrow(/measured LCP/);
 expect(()=>parseContent({...article,blocks:[{...image,preload:'true'}]})).toThrow();
});
