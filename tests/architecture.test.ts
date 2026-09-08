import { expect, it } from 'vitest';
import { architectureViolations } from '../scripts/architecture-rules';

it('rejects unsupported client islands, copied branding, SEO literals and any', () => {
  const source = `'use client';\nconst value: any = 1;\nexport default function Page(){ return <h1>Hardcoded brand</h1>; }`;
  expect(architectureViolations('src/app/page.tsx', source)).toHaveLength(3);
  expect(architectureViolations('src/components/meta.tsx', '<meta name="description" content="bad" />').length).toBeGreaterThan(0);
});
it('accepts an explained client boundary and config-driven text', () => {
  const source = `// Browser-only form state requires a local interactive component.\n'use client';\nexport default function Page(){ return <h1>{site.ui.title}</h1>; }`;
  expect(architectureViolations('src/components/form.tsx', source)).toEqual([]);
});

it('permits effects only in the consent leaf and never a wrapper around page content',()=>{
 const source="// Browser-only consent event handling requires this leaf.\n'use client';\nuseEffect(()=>startConsent(),[]);";
 expect(architectureViolations('src/components/consent-controls.tsx',source)).toEqual([]);
 expect(architectureViolations('src/app/page.tsx',source)).toContain('Indexable route content cannot depend on client fetching or a Suspense shell');
 expect(architectureViolations('src/components/consent-controls.tsx',source+' const children = content;')).not.toEqual([]);
});
