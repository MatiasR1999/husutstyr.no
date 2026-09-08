import { mkdir, writeFile } from 'node:fs/promises';
import site from '../site.config';

const entries = Object.entries(site.tokens);
for (const [key, value] of entries) {
  if (!/^--[a-z0-9-]+$/.test(key) || /[{};<>]/.test(value)) throw new Error('Unsafe CSS token');
}
await mkdir('src/app', { recursive: true });
await writeFile('src/app/site-tokens.css', '/* Generated from site.config.ts. Do not edit. */\n:root {\n' + entries.map(([key, value]) => `  ${key}: ${value};`).join('\n') + '\n}\n');
console.log('PASS: Generated the single site token file.');

await writeFile('src/app/site-fonts.ts',`// Generated from site.config.ts. Do not edit.
import { ${site.fonts.body}, ${site.fonts.heading} } from 'next/font/google';
export const bodyFont=${site.fonts.body}({subsets:['latin'],display:'swap',variable:'--loaded-body'});
export const headingFont=${site.fonts.heading}({subsets:['latin'],display:'swap',variable:'--loaded-heading'});
`);
