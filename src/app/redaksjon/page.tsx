import site from '@site';
import { currentSession } from '@/lib/auth/session';
import { documents } from '@/lib/editorial/repository';
import { privateMetadata } from '@/lib/seo/private';
export const dynamic='force-dynamic';
export const generateMetadata=privateMetadata;
export default async function EditorialPage() {
 const session=await currentSession();
 if(!session || session.principal.role==='viewer') return <div className="stack"><h1>{site.editorial.ui.title}</h1><a href="/api/auth/login">{site.editorial.ui.login}</a></div>;
 const articles=await documents(session.hash);
 return <div className="stack"><h1>{site.editorial.ui.title}</h1><p>{site.editorial.ui.publishingLater}</p><a href="/redaksjon/ny">{site.editorial.ui.create}</a><ul>{articles.map(article=><li key={article.id}><a href={`/redaksjon/artikler/${article.id}`}>{article.payload.title}</a></li>)}</ul>{!articles.length&&<p>{site.editorial.ui.empty}</p>}<form method="post" action="/api/auth/logout"><button>{site.editorial.ui.logout}</button></form></div>;
}
