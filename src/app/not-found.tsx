import site from '@site';

export default function NotFound() {
  return <div className="stack"><h1>{site.ui.notFound}</h1><a href="/">{site.ui.back}</a></div>;
}
