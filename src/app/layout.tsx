import type { ReactNode } from 'react';
import site from '@site';
import { readRuntimeConfig } from '@/lib/config';
import { getCategories,getTrustPages } from '@/lib/content';
import './globals.css';
export {privacyMetadata as metadata} from '@/lib/seo/measurement';
import {ConsentControls} from '@/components/consent-controls';
import {measurementRuntime} from '@/lib/measurement/config';
import {bodyFont,headingFont} from './site-fonts';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [categories,trustPages] = await Promise.all([getCategories(),getTrustPages()]);
  const runtime = readRuntimeConfig(process.env);
  return <html lang={site.locale} className={`${bodyFont.variable} ${headingFont.variable}`}><body>
    <a className="skip" href="#main-content">{site.ui.skip}</a>
    {runtime.qa && <div className="notice" role="note">{site.qa.banner}</div>}
    <header className="shell header mx-auto flex flex-wrap items-center justify-between">
      <a className="brand" href="/">{runtime.identity.name}</a>
      <details><summary>{site.ui.menu}</summary><nav className="navigation" aria-label={site.ui.menu}>
        <a href="/">{site.ui.home}</a>
        {categories.map(category => <a key={category.id} href={`/${category.slug}`}>{category.name}</a>)}
      </nav></details>
    </header>
    <main id="main-content" className="shell main mx-auto">{children}</main>
    <footer className="shell footer mx-auto">{site.content.footer}<nav className="navigation" aria-label={site.labels.trust}>{trustPages.map(page=><a key={page.slug} href={`/${page.slug}`}>{page.title}</a>)}</nav><ConsentControls consent={site.consent} measurement={measurementRuntime(runtime,process.env)} locale={site.locale} /></footer>
  </body></html>;
}
