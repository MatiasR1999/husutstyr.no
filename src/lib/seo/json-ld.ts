import { z } from 'zod';
import site from '@site';
import type { RuntimeConfig } from '../config';
import type { QaArticle } from '../site-types';
import type { ArticleContent,ReviewSnapshot } from '../domain/content';
import {currentPrice} from '../domain/content';
import { articlePath, canonicalUrl } from './urls';
const url = z.url({ protocol: /^https?$/ });
const reference = z.object({ '@id': url }).strict();
const articleNode = z.object({ '@type': z.enum(['Article', 'NewsArticle']), '@id': url, url, headline: z.string().min(1), description: z.string().min(1), datePublished: z.iso.datetime(), dateModified: z.iso.datetime(), author: reference, publisher: reference, mainEntityOfPage: url }).strict();
const personNode = z.object({ '@type': z.literal('Person'), '@id': url, name: z.string().min(1),url:url.optional(),description:z.string().optional(),image:url.optional(),knowsAbout:z.array(z.string()).optional(),sameAs:z.array(url).optional() }).strict();
const organizationNode = z.object({ '@type': z.literal('Organization'), '@id': url, name: z.string().min(1), url }).strict();
const websiteNode=z.object({'@type':z.literal('WebSite'),'@id':url,url,name:z.string().min(1),inLanguage:z.literal('nb'),publisher:reference}).strict();
const breadcrumbNode = z.object({ '@type': z.literal('BreadcrumbList'), '@id': url, itemListElement: z.array(z.object({ '@type': z.literal('ListItem'), position: z.number().int().positive(), name: z.string().min(1), item: url }).strict()).min(2) }).strict();
const productNode=z.object({'@type':z.literal('Product'),'@id':url,name:z.string().min(1),sku:z.string().optional(),manufacturer:z.object({'@type':z.literal('Organization'),name:z.string()}).optional(),offers:z.object({'@type':z.literal('Offer'),price:z.string().regex(/^\d+(\.\d{1,2})?$/),priceCurrency:z.string().regex(/^[A-Z]{3}$/),url}).strict()}).strict();
const reviewNode=z.object({'@type':z.literal('Review'),'@id':url,name:z.string().min(1),reviewBody:z.string().min(30),datePublished:z.iso.datetime(),author:reference,itemReviewed:reference,reviewRating:z.object({'@type':z.literal('Rating'),ratingValue:z.number().min(site.editorial.ratingMin).max(site.editorial.ratingMax),worstRating:z.literal(1),bestRating:z.literal(5)}).strict()}).strict();
const nodeSchema = z.discriminatedUnion('@type', [articleNode, personNode, organizationNode, breadcrumbNode,websiteNode,productNode,reviewNode]);
export const graphSchema = z.object({ '@context': z.literal('https://schema.org'), '@graph': z.array(nodeSchema).min(1) }).strict().superRefine((graph, context) => {
 const nodes=new Map(graph['@graph'].map(node=>[node['@id'],node]));
 if(nodes.size!==graph['@graph'].length) context.addIssue({code:'custom',message:'Duplicate node identifier'});
 const requireType=(id:string,type:string)=>{if(nodes.get(id)?.['@type']!==type) context.addIssue({code:'custom',message:'Unresolved or mistyped reference'});};
 for(const node of graph['@graph']) {
  if(node['@type']==='Article'||node['@type']==='NewsArticle') {requireType(node.author['@id'],'Person');requireType(node.publisher['@id'],'Organization');if(Date.parse(node.dateModified)<Date.parse(node.datePublished)) context.addIssue({code:'custom',message:'Modification precedes publication'});}
  if(node['@type']==='WebSite') requireType(node.publisher['@id'],'Organization');
  if(node['@type']==='Review'){requireType(node.author['@id'],'Person');requireType(node.itemReviewed['@id'],'Product');}
  if(node['@type']==='BreadcrumbList'&&node.itemListElement.some((item,i)=>item.position!==i+1)) context.addIssue({code:'custom',message:'Invalid breadcrumb positions'});
 }
});
export type JsonLdGraph = z.infer<typeof graphSchema>;
export interface Crumb { readonly name: string; readonly path: string }
export function breadcrumbsGraph(config: RuntimeConfig, path: string, crumbs: readonly Crumb[]): JsonLdGraph {
 return graphSchema.parse({ '@context': 'https://schema.org', '@graph': [{ '@type': 'BreadcrumbList', '@id': `${canonicalUrl(config.identity.url, path)}#breadcrumbs`, itemListElement: crumbs.map((crumb, i) => ({ '@type': 'ListItem', position: i + 1, name: crumb.name, item: new URL(crumb.path,config.identity.url).href })) }] });
}
export function siteGraph(config:RuntimeConfig):JsonLdGraph {
 const home=canonicalUrl(config.identity.url,'/'),publisher=`${home}#publisher`;
 return graphSchema.parse({'@context':'https://schema.org','@graph':[{'@type':'Organization','@id':publisher,name:config.identity.name,url:home},{'@type':'WebSite','@id':`${home}#website`,name:config.identity.name,url:home,inLanguage:site.locale,publisher:{'@id':publisher}}]});
}
type Author=QaArticle['author']&{bio?:string;image?:{url:string}|null;expertise?:readonly string[];sameAs?:readonly string[]};
export function personGraph(config:RuntimeConfig,author:Author):JsonLdGraph {
 const path=canonicalUrl(config.identity.url,`/forfatter/${author.slug}`);
 return graphSchema.parse({'@context':'https://schema.org','@graph':[{'@type':'Person','@id':`${path}#person`,url:path,name:author.name,...(author.bio?{description:author.bio}:{}),...(author.image?{image:author.image.url}:{}),...(author.expertise?.length?{knowsAbout:author.expertise}:{}),...(author.sameAs?.length?{sameAs:author.sameAs}:{})}]});
}
export function combineGraphs(...graphs:JsonLdGraph[]):JsonLdGraph {return graphSchema.parse({'@context':'https://schema.org','@graph':graphs.flatMap(graph=>graph['@graph'])});}
export function articleCrumbs(article:QaArticle&{categoryName?:string;pillarSlug?:string}):Crumb[] {
 return [{name:site.ui.home,path:'/'},{name:article.categoryName??site.qa.category.name,path:`/${article.pillarSlug??article.categorySlug}`},{name:article.title,path:articlePath(article.categorySlug,article.slug)}];
}
export function buildArticleGraph(config:RuntimeConfig,article:QaArticle&{author:Author;categoryName?:string;pillarSlug?:string;kind?:'article'|'news'|'review'|'page';payload?:ArticleContent;reviewSnapshot?:ReviewSnapshot|null},now=Date.now()):JsonLdGraph {
 const path=articlePath(article.categorySlug,article.slug),canonical=canonicalUrl(config.identity.url,path);
 const person=personGraph(config,article.author),author=person['@graph'][0]!['@id'],publisher=`${canonicalUrl(config.identity.url,'/')}#publisher`;
 const graph=combineGraphs(siteGraph(config),person,breadcrumbsGraph(config,path,articleCrumbs(article)));
 graph['@graph'].unshift({'@type':article.kind==='news'?'NewsArticle':'Article','@id':`${canonical}#article`,url:canonical,headline:article.title,description:article.summary,datePublished:article.publishedAt,dateModified:article.modifiedAt,author:{'@id':author},publisher:{'@id':publisher},mainEntityOfPage:canonical});
 const product=article.reviewSnapshot,price=currentPrice(product,now),review=article.payload?.kind==='review'?article.payload.review:null;
 if(product&&price) graph['@graph'].push({'@type':'Product','@id':`${canonical}#product`,name:product.name,...(product.identifier?{sku:product.identifier}:{}),...(product.manufacturer?{manufacturer:{'@type':'Organization',name:product.manufacturer}}:{}),offers:{'@type':'Offer',price:price.amount,priceCurrency:price.currency,url:price.source}});
 if(product&&price&&review&&!product.owned&&!review.paid&&review.rating!==undefined) graph['@graph'].push({'@type':'Review','@id':`${canonical}#review`,name:article.title,reviewBody:review.method,datePublished:article.publishedAt,author:{'@id':author},itemReviewed:{'@id':`${canonical}#product`},reviewRating:{'@type':'Rating',ratingValue:review.rating,worstRating:1,bestRating:5}});
 return graphSchema.parse(graph);
}
export function serializeJsonLd(graph:JsonLdGraph):string {return JSON.stringify(graphSchema.parse(graph)).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
