import ts from 'typescript';

export function architectureViolations(file: string, text: string): string[] {
  const failures: string[] = [];
  const isSeo = file.startsWith('src/lib/seo/');
  const isComponent = file.endsWith('.tsx') && !isSeo;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  if (/(^|\n)\s*['"]use client['"]/.test(text)) {
    const lines = text.split('\n');
    const i = lines.findIndex(line => /^\s*['"]use client['"]/.test(line));
    if (i < 1 || !(lines[i - 1] ?? '').trimStart().startsWith('//') || (lines[i - 1] ?? '').trim().length < 20) failures.push('use client requires an explanatory preceding comment');
  }
  const consentLeaf = file === 'src/components/consent-controls.tsx' && !/\bchildren\b/.test(text);
  if (isComponent && (/Suspense|dynamic\([^]*ssr:\s*false/.test(text) || (!consentLeaf && /useEffect/.test(text)))) failures.push('Indexable route content cannot depend on client fetching or a Suspense shell');
  if (!isSeo && /application\/ld\+json|https:\/\/schema\.org|X-Robots-Tag|<title[\s>]|<meta\s|rel=["']canonical/.test(text) && file !== 'src/proxy.ts') failures.push('SEO literal outside src/lib/seo');
  const visit = (node: ts.Node): void => {
    if (node.kind === ts.SyntaxKind.AnyKeyword) failures.push('Explicit any is forbidden');
    if (isComponent && ts.isJsxText(node) && /[\p{L}\p{N}]/u.test(node.text.trim())) failures.push('Visible JSX text must come from site config or content');
    if (isComponent && ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer) && ['title', 'aria-label', 'alt', 'placeholder'].includes(node.name.getText(source))) failures.push('Visible attribute text must come from site config or content');
    if (isComponent && ts.isStringLiteral(node) && /^(https?:\/\/|#[\da-f]{3,8}$)/i.test(node.text)) failures.push('Site URL or color literal outside site.config.ts');
    if (!isSeo && ts.isPropertyAssignment(node) && ['canonical', 'openGraph', 'twitter', 'robots'].includes(node.name.getText(source).replace(/["']/g, ''))) failures.push('SEO object defined outside src/lib/seo');
    ts.forEachChild(node, visit);
  };
  visit(source);
  return [...new Set(failures)];
}
