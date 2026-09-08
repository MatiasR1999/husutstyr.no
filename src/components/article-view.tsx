import site from '@site';
import type {PublishedArticle} from '@/lib/content';
import {getTopics} from '@/lib/content';
import {layoutVariants} from '@/lib/layouts';
import {readRuntimeConfig} from '@/lib/config';
import {currentPrice} from '@/lib/domain/content';
import {articleCrumbs,buildArticleGraph} from '@/lib/seo/json-ld';
import {JsonLd} from '@/lib/seo/json-ld-element';
import {Breadcrumbs} from './breadcrumbs';
import {ArticleBody} from './article-body';
import {CommercialNotice} from './commercial-notice';

export async function ArticleView({article,now}:{article:PublishedArticle;now:number}) {
 const variant=layoutVariants().article,price=currentPrice(article.reviewSnapshot,now);
 const topics=(await getTopics()).filter(topic=>article.payload.topicIds.includes(topic.id));
 const byline=<p className="meta">{site.ui.author}: <a href={`/forfatter/${article.author.slug}`}>{article.author.name}</a><br />{site.ui.published}: <time dateTime={article.publishedAt}>{article.publishedAt.slice(0,10)}</time>{Date.parse(article.modifiedAt)>Date.parse(article.publishedAt)&&<><br />{site.ui.modified}: <time dateTime={article.modifiedAt}>{article.modifiedAt.slice(0,10)}</time></>}</p>;
 const contents=<nav aria-label={site.ui.contents}><a aria-label={site.ui.contents} href={`#${article.section.id}`}>{article.section.title}</a></nav>;
 const heading=<header className="article-heading stack"><h1>{article.title}</h1><p className="lead">{article.summary}</p>{variant!=='reference'&&byline}</header>;
 const body=<div className="article-body stack" id={article.section.id}><h2>{article.section.title}</h2><ArticleBody blocks={article.blocks} articleId={article.id} revisionId={article.revisionId} />
  {article.payload.kind==='review'&&<section className="review-facts stack"><h2>{site.labels.method}</h2><p>{article.payload.review.method}</p>{article.reviewSnapshot&&<p>{site.labels.product}: {article.reviewSnapshot.name}</p>}{article.payload.review.rating!==undefined&&<p data-rating={article.payload.review.rating}>{site.labels.rating}: {article.payload.review.rating} / {site.editorial.ratingMax}</p>}{price&&<p data-price={price.amount}>{site.labels.price}: {price.amount} {price.currency}<br /><a href={price.source}>{site.labels.sources}</a> · {site.labels.checked}: <time dateTime={price.checkedAt}>{price.checkedAt}</time></p>}</section>}
  {article.payload.sources.length>0&&<section><h2>{site.labels.sources}</h2><ul>{article.payload.sources.map(source=><li key={source.url}><a href={source.url}>{source.title}</a> · <time dateTime={source.checkedAt}>{source.checkedAt.slice(0,10)}</time></li>)}</ul></section>}
 </div>;
 return <article className={`stack article-${variant}`} data-layout={variant} data-publication-hash={article.contentHash}>
  <CommercialNotice blocks={article.blocks} paid={article.payload.kind==='review'&&article.payload.review.paid} owned={Boolean(article.reviewSnapshot?.owned)} />
  <Breadcrumbs items={articleCrumbs(article)} />
  {variant==='classic'?<>{heading}{contents}{body}</>:variant==='editorial'?<><div className="editorial-intro">{heading}<aside>{contents}</aside></div>{body}</>:<>{heading}<div className="reference-grid"><aside className="stack">{byline}{contents}</aside>{body}</div></>}
  <footer className="article-footer stack"><a data-pillar href={`/${article.pillarSlug}`}>{article.categoryName}</a>{topics.length>0&&<nav aria-label={site.labels.topics}>{topics.map(topic=><a className="topic-link" key={topic.id} href={`/emne/${topic.slug}`}>{topic.name}</a>)}</nav>}</footer>
  <JsonLd graph={buildArticleGraph(readRuntimeConfig(process.env),article,now)} />
 </article>;
}
