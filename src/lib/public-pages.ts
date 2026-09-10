import 'server-only';
import {cache} from 'react';
import site from '@site';
import {getArticle,getAllArticles,getCategories,getCategory,getTopics,getPageCopy} from './content';
import {readRuntimeConfig} from './config';
import {listingSlice,parsePageQuery} from './seo/listing';
import type {PageQuery} from './seo/listing';

export const resolvePage=cache(async(path:string,search='')=>{
 const query=parsePageQuery(new URLSearchParams(search));if(!query) return null;
 const parts=path.split('/').filter(Boolean);
 const trust=site.trustPages.find(page=>path===`/${page.slug}`);
 if(trust || (parts.length===2&&!['forfatter','emne'].includes(parts[0]!))) {
  const [article]=await Promise.all([getArticle(trust?'_pages':parts[0]!,trust?trust.slug:parts[1]!),trust?null:getTopics()]);
  if(!article || (article.kind==='review'&&query.facet) || query.page!==1 || query.topic || query.sort!=='newest') return null;
  const data={path,query,article,title:article.title,seo:article.seo,evaluatedAt:Date.now()};
  return article.kind==='page'?{...data,type:'trust' as const}:{...data,type:'article' as const};
 }
 if(path==='/') {
  if(query.page!==1||query.facet) return null;
  const [categories,articles]=await Promise.all([getCategories(),getAllArticles()]);
  // The front page is chronological: getAllArticles already orders by published_at desc. Categories stay
  // for browsing, but they no longer decide the reading order.
  const groups=categories.map(category=>({category,articles:articles.filter(article=>article.pillarSlug===category.slug||article.categorySlug===category.slug)}));
  const runtime=readRuntimeConfig(process.env);
  return {type:'home' as const,path,query,groups,articles,categories,title:runtime.qa?site.qa.home.title:site.home.title,seo:runtime.qa?site.qa.home:site.home};
 }
 const [allArticles,topics]=await Promise.all([getAllArticles(),getTopics()]);
 let articles=allArticles;
 let title:string;let intro='';let type:'category'|'topic'|'author';let author:typeof articles[number]['author']|undefined;
 let baseCopy:typeof site.home|{title:string;description:string}|undefined;let count=articles.length;
 if(parts.length===1) {
  const category=await getCategory(parts[0]!);
  if(!category&&parts[0]!=='anmeldelser') return null;
  articles=articles.filter(article=>category?(category.slug==='anmeldelser'?article.kind==='review':article.pillarSlug===category.slug):article.kind==='review');
  if(!articles.length) return null;
  type='category';title=category?.name??site.labels.reviews;intro=category?.introduction??'';baseCopy=category?.seo;
 } else if(parts.length===2&&parts[0]==='emne') {
  const topic=topics.find(topic=>topic.slug===parts[1]);if(!topic) return null;
  articles=articles.filter(article=>article.topicIds.includes(topic.id));
  type='topic';title=topic.name;count=articles.length;
 } else if(parts.length===2&&parts[0]==='forfatter') {
  articles=articles.filter(article=>article.author.slug===parts[1]);
  // Use only approved snapshots; a mutable draft profile can never leak through this route.
  author=articles.toSorted((a,b)=>b.modifiedAt.localeCompare(a.modifiedAt))[0]?.author;
  if(!author) return null;type='author';title=author.name;
 } else return null;
 if(query.topic){const topic=topics.find(topic=>topic.slug===query.topic);if(!topic) return null;articles=articles.filter(article=>article.topicIds.includes(topic.id));}
 if(query.sort==='oldest') articles=articles.toReversed();
 const slice=listingSlice(articles,query.page);if(!slice) return null;
 const seo=await getPageCopy(path,query.page)??(query.page===1?baseCopy:null);
 if(!seo) return null;
 return {type,path,query,title,intro,seo,author,topics,articles:slice.items,pages:slice.pages,belowThreshold:type==='topic'&&count<site.minTopicArticles};
});
export type PublicPage=NonNullable<Awaited<ReturnType<typeof resolvePage>>>;
export function emptyQuery():PageQuery {return {page:1,facet:false,params:{},sort:'newest'};}
