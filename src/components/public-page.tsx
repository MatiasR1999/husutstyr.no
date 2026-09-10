import Image from 'next/image';
import site from '@site';
import type {PublicPage} from '@/lib/public-pages';
import {layoutVariants} from '@/lib/layouts';
import {readRuntimeConfig} from '@/lib/config';
import {articlePath} from '@/lib/seo/urls';
import {queryHref} from '@/lib/seo/listing';
import {breadcrumbsGraph,combineGraphs,personGraph,siteGraph} from '@/lib/seo/json-ld';
import {JsonLd} from '@/lib/seo/json-ld-element';
import {Breadcrumbs} from './breadcrumbs';
import {ArticleView} from './article-view';
import {ArticleBody} from './article-body';
import {CommercialNotice} from './commercial-notice';

export function PublicPageView({page}:{page:PublicPage}) {
 const runtime=readRuntimeConfig(process.env);
 if(page.type==='article') return <ArticleView article={page.article} now={page.evaluatedAt} />;
 if(page.type==='home') {
  const variant=layoutVariants().home;
  const categoryLinks=<nav className="category-links" aria-label={site.labels.explore}>{page.categories.map(category=><a key={category.id} href={`/${category.slug}`}>{category.name}</a>)}</nav>;
  // Newest first across the whole site; the category is a label on each entry, not the ordering principle.
  // Whole cards are the link target, the way a news front page behaves. A lead image renders when the
  // article has one; without it the card is text only, so the grid never waits on artwork.
  const shown=page.articles.slice(0,site.pageSize);
  const card=(article:(typeof shown)[number],lead:boolean)=><li key={article.id} className={lead?'card card-lead':'card'}>
   <a className="card-link" href={articlePath(article.categorySlug,article.slug)}>
    <span className="card-label">{article.categoryName}</span>
    <span className="card-title">{article.title}</span>
    {lead&&<span className="card-summary">{article.summary}</span>}
   </a></li>;
  const feed=<ul className="front-grid">{shown.map((article,index)=>card(article,index===0))}</ul>;
  const groups=page.groups.map(({category,articles})=><section className="category-group stack" key={category.id}><h2><a href={`/${category.slug}`}>{category.name}</a></h2><ul className="article-list">{articles.slice(0,site.pageSize).map(article=><li key={article.id}><a href={articlePath(article.categorySlug,article.slug)}>{article.title}</a>{variant==='magazine'&&<p>{article.summary}</p>}</li>)}</ul></section>);
  return <div className={`stack home-${variant}`} data-layout={variant}><header className="home-intro stack"><h1>{page.title}</h1><p className="lead">{site.content.home}</p></header>
   {variant==='index'?<>{categoryLinks}{groups}</>:variant==='magazine'?<>{categoryLinks}{feed}</>:<div className="directory-grid"><aside>{categoryLinks}</aside><div className="stack">{groups}</div></div>}
   <JsonLd graph={siteGraph(runtime)} /></div>;
 }
 const crumbs=[{name:site.ui.home,path:'/'},{name:page.title,path:page.path},...(page.query.page>1?[{name:`${site.labels.page} ${page.query.page}`,path:queryHref(page.path,page.query.params)}]:[])];
 const graph=combineGraphs(siteGraph(runtime),breadcrumbsGraph(runtime,page.path,crumbs),...(page.type==='author'&&page.author?[personGraph(runtime,page.author)]:[]));
 if(page.type==='trust') return <div className="stack trust-page" data-publication-hash={page.article.contentHash}><CommercialNotice blocks={page.article.blocks} /><Breadcrumbs items={crumbs} /><h1>{page.title}</h1><p className="lead">{page.article.summary}</p><section className="article-body stack"><h2>{page.article.section.title}</h2><ArticleBody blocks={page.article.blocks} articleId={page.article.id} /></section><JsonLd graph={graph} /></div>;
 return <div className="stack listing-page"><Breadcrumbs items={crumbs} /><h1>{page.title}{page.query.page>1&&<> · {site.labels.page} {page.query.page}</>}</h1>{page.intro&&<p className="lead">{page.intro}</p>}
  {page.author&&<section className="author-profile stack">{page.author.image&&<Image src={page.author.image.url} alt={page.author.image.alt} width={page.author.image.width} height={page.author.image.height} sizes={site.media.sizes} />}<p>{page.author.bio}</p>{Boolean(page.author.expertise?.length)&&<><h2>{site.labels.expertise}</h2><ul>{page.author.expertise?.map(item=><li key={item}>{item}</li>)}</ul></>}{Boolean(page.author.sameAs?.length)&&<nav aria-label={site.labels.profiles}>{page.author.sameAs?.map(url=><a key={url} href={url}>{url}</a>)}</nav>}</section>}
  <form action={page.path} method="get" className="listing-filters"><label>{site.labels.sort}<select name="sort" defaultValue={page.query.sort}><option value="newest">{site.labels.newest}</option><option value="oldest">{site.labels.oldest}</option></select></label><button type="submit">{site.labels.apply}</button></form>
  <ul className="article-list">{page.articles.map(article=><li key={article.id}><a href={articlePath(article.categorySlug,article.slug)}>{article.title}</a></li>)}</ul>
  {page.pages>1&&<nav aria-label={site.labels.pagination}><ol className="pagination">{Array.from({length:page.pages},(_,i)=>i+1).map(number=><li key={number}><a href={queryHref(page.path,{...page.query.params,page:String(number)})} aria-current={number===page.query.page?'page':undefined}>{site.labels.page} {number}</a></li>)}</ol></nav>}
  <JsonLd graph={graph} /></div>;
}
