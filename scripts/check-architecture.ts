import { readFile, readdir } from 'node:fs/promises';
import { architectureViolations } from './architecture-rules';

const files = (await readdir('src', { recursive: true })).filter(file => /\.tsx?$/.test(file));
const failures: string[] = [];
for (const name of files) {
  const file = `src/${name}`;
  const source = await readFile(file, 'utf8');
  failures.push(...architectureViolations(file, source).map(message => `${file}: ${message}`));
}
const css = await readFile('src/app/globals.css', 'utf8');
if (/#[a-f\d]{3,8}\b|:\s*\d+(?:px|rem|em)\b/i.test(css)) failures.push('CSS design literals outside generated token file');
if (files.some(file => /(^|\/)loading\.tsx$/.test(file))) failures.push('A loading boundary can stream an empty article shell');
if (failures.length) throw new Error(failures.join('\n'));
console.log(`PASS: Architecture rules checked ${files.length} source files.`);
