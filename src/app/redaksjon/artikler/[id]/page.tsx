import {randomUUID} from 'node:crypto';
import {publicationStatus} from '@/lib/editorial/publication';
import { notFound } from 'next/navigation';
import site from '@site';
import { currentSession } from '@/lib/auth/session';
import { documents } from '@/lib/editorial/repository';
import { privateMetadata } from '@/lib/seo/private';
import { ArticleBody } from '@/components/article-body';
export const dynamic='force-dynamic';
export const generateMetadata=privateMetadata;
export default async function DraftPage({params}:{params:Promise<{id:string}>}) {
 const session=await currentSession();if(!session || session.principal.role==='viewer') notFound();
 const {id}=await params;const article=(await documents(session.hash)).find(row=>row.id===id);if(!article) notFound();
 const content=article.payload,ui=site.editorial.ui;
 const job=article.publicationEventId&&session.principal.role==='editor'?await publicationStatus(session.hash,article.publicationEventId):null;
 return <div className="stack"><h1>{content.title}</h1><p>{ui.preview}</p><p>{ui.revision}: {article.revisionId}</p><p>{ui.state}: {article.status}</p><ArticleBody blocks={content.blocks} articleId={article.id} />
 {content.blocks.every(block=>block.type==='paragraph')&&<form method="post" action={`/api/editor/articles/${id}`} className="stack"><input type="hidden" name="revisionId" value={article.revisionId}/><input type="hidden" name="action" value="save"/>
 <label>{ui.titleField}<input name="title" defaultValue={content.title} required /></label><label>{ui.summary}<textarea name="summary" defaultValue={content.summary} required /></label><label>{ui.body}<textarea name="body" rows={14} defaultValue={content.blocks.flatMap(block=>block.type==='paragraph'?[block.text]:[]).join('\n\n')} required /></label><label>{ui.seoTitle}<input name="seoTitle" defaultValue={content.seo.title} required /></label><label>{ui.description}<textarea name="description" defaultValue={content.seo.description} required /></label><button>{ui.save}</button></form>}
 <form method="post" action={`/api/editor/articles/${id}`}><input type="hidden" name="revisionId" value={article.revisionId}/><button name="action" value="submit">{ui.submit}</button>{session.principal.role==='editor'&&!article.approved&&<button name="action" value="approve">{ui.approve}</button>}</form>
 {session.principal.role==='editor'&&<div className="stack">
 {article.approved&&<form method="post" action="/api/editor/publication"><input type="hidden" name="operation" value="publish"/><input type="hidden" name="articleId" value={id}/><input type="hidden" name="revisionId" value={article.revisionId}/><input type="hidden" name="requestId" value={randomUUID()}/><button>{ui.publish}</button></form>}
 {article.publishedRevisionId&&<form method="post" action="/api/editor/publication"><input type="hidden" name="operation" value="withdraw"/><input type="hidden" name="articleId" value={id}/><input type="hidden" name="revisionId" value={article.publishedRevisionId}/><input type="hidden" name="requestId" value={randomUUID()}/><button>{ui.withdraw}</button></form>}
 {job&&<><p>{job.cache_state==='confirmed'?ui.confirmed:job.cache_state==='superseded'?ui.superseded:ui.pending}</p>{job.notification_state==='pending'&&<p>{ui.notificationPending}</p>}{job.notification_state==='rejected'&&<p>{ui.notificationRejected}</p>}<form method="post" action="/api/editor/publication"><input type="hidden" name="operation" value="retry"/><input type="hidden" name="articleId" value={id}/><input type="hidden" name="eventId" value={job.event_id}/><button>{ui.retry}</button></form></>}
 </div>}
 </div>;
}
