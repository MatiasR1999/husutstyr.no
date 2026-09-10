import { mkdir, writeFile } from 'node:fs/promises';
import site from '../site.config';

const entries = Object.entries(site.tokens);
const darkEntries = Object.entries(site.tokensDark ?? {});
for (const [key, value] of [...entries, ...darkEntries]) {
  if (!/^--[a-z0-9-]+$/.test(key) || /[{};<>]/.test(value)) throw new Error('Unsafe CSS token');
}
// Every dark token must override one that already exists, so the dark theme can only restate the palette.
for (const [key] of darkEntries) if (!(key in site.tokens)) throw new Error(`Dark token ${key} overrides nothing`);
const block = (list: [string, string][]) => list.map(([key, value]) => `  ${key}: ${value};`).join('\n');
await mkdir('src/app', { recursive: true });
await writeFile('src/app/site-tokens.css', '/* Generated from site.config.ts. Do not edit. */\n:root {\n' + block(entries) + '\n}\n'
  + (darkEntries.length ? '\n@media (prefers-color-scheme: dark) {\n  :root {\n' + block(darkEntries).replace(/^/gm, '  ') + '\n  }\n}\n' : ''));
console.log('PASS: Generated the single site token file.');

await writeFile('src/app/site-fonts.ts',`// Generated from site.config.ts. Do not edit.
import { ${site.fonts.body}, ${site.fonts.heading} } from 'next/font/google';
export const bodyFont=${site.fonts.body}({subsets:['latin'],display:'swap',variable:'--loaded-body'});
export const headingFont=${site.fonts.heading}({subsets:['latin'],display:'swap',variable:'--loaded-heading'});
`);
