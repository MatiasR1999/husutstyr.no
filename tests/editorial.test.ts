import { describe,it,expect } from 'vitest';
import site from '../site.config';
import { parseContent } from '../src/lib/domain/content';
const common={version:1,title:site.qa.article.title,summary:site.qa.article.summary,section:site.qa.article.section,blocks:[{type:'paragraph',text:site.qa.article.body[0]}],seo:site.qa.article.seo,sources:[],research:[],topicIds:[]};
describe('versioned editorial content',()=>{
 it('accepts an ordinary article and rejects ambiguous type fields',()=>{expect(parseContent({...common,kind:'article'}).kind).toBe('article');expect(()=>parseContent({...common,kind:'article',review:{}})).toThrow();});
 it('requires news dateline and event date',()=>{expect(()=>parseContent({...common,kind:'news'})).toThrow();expect(parseContent({...common,kind:'news',news:{dateline:site.qa.category.name,occurredAt:site.qa.article.publishedAt}}).kind).toBe('news');});
 it('rejects unsupported versions and executable image URLs',()=>{expect(()=>parseContent({...common,kind:'article',version:2})).toThrow();expect(()=>parseContent({...common,kind:'article',blocks:[{type:'image',image:{assetId:crypto.randomUUID(),url:'javascript:alert(1)',alt:'QA',width:100,height:100,rights:'QA'}}]})).toThrow();});
 it('requires documented research and valid review ratings',()=>{expect(()=>parseContent({...common,kind:'article',research:[{method:true}]})).toThrow();const review={productId:crypto.randomUUID(),rating:5,paid:false,method:site.qa.markers.research};expect(parseContent({...common,kind:'review',review}).kind).toBe('review');expect(()=>parseContent({...common,kind:'review',review:{...review,rating:6}})).toThrow();});
 it('rejects empty paragraphs and invalid SEO lengths',()=>{expect(()=>parseContent({...common,kind:'article',blocks:[]})).toThrow();expect(()=>parseContent({...common,kind:'article',seo:{title:'short',description:'short'}})).toThrow();});
});
