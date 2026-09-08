import { notFound } from 'next/navigation';
import site from '@site';
import { currentSession } from '@/lib/auth/session';
import { editableCategories } from '@/lib/editorial/repository';
import { privateMetadata } from '@/lib/seo/private';
export const dynamic='force-dynamic';
export const generateMetadata=privateMetadata;
export default async function NewArticle() {
 const session=await currentSession();if(!session || session.principal.role==='viewer') notFound();const categories=await editableCategories(session.hash),ui=site.editorial.ui;
 return <div className="stack"><h1>{ui.create}</h1><form method="post" action="/api/editor/articles" className="stack"><label>{ui.category}<select name="categoryId" required>{categories.map(category=><option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>{ui.titleField}<input name="title" required /></label><label>{ui.summary}<textarea name="summary" required /></label><label>{ui.body}<textarea name="body" rows={14} required /></label><label>{ui.seoTitle}<input name="seoTitle" minLength={50} maxLength={60} required /></label><label>{ui.description}<textarea name="description" minLength={140} maxLength={160} required /></label><button>{ui.create}</button></form></div>;
}
