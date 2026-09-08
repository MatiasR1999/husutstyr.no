import site from '@site';
import type { Crumb } from '@/lib/seo/json-ld';

export function Breadcrumbs({ items }: { items: readonly Crumb[] }) {
  return <nav aria-label={site.ui.breadcrumb}><ol className="breadcrumbs flex flex-wrap">
    {items.map((item, index) => <li key={item.path}>{index === items.length - 1 ? <span aria-current="page">{item.name}</span> : <a href={item.path}>{item.name}</a>}</li>)}
  </ol></nav>;
}
