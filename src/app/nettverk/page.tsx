import site from '@site';
import {ownedSitesMetadata} from '@/lib/seo/owned-sites';

// Reachable and indexable, but deliberately absent from the navigation at the publisher's instruction.
// Nothing is hidden from a visitor who opens the URL, and the markup is the same for every requester.
export const revalidate=3600;
export function generateMetadata(){return ownedSitesMetadata();}
export default function OwnedSitesPage() {
 const owned=site.ownedSites;
 return <div className="stack trust-page">
  <h1>{owned.title}</h1>
  <p className="lead">{owned.description}</p>
  <ul className="article-list">{owned.sites.map(entry=><li key={entry.name}><div>
   {entry.url?<a href={entry.url}>{entry.name}</a>:<span className="card-title">{entry.name}</span>}
   <p>{entry.description}</p>
   {entry.url?null:<p className="meta">{owned.current}</p>}
  </div></li>)}</ul>
 </div>;
}
