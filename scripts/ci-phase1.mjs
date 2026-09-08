import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:os';

await mkdir('docs/qa', { recursive: true });
const results = [];
const stages = [['build', ['run', 'build']], ['typecheck', ['run', 'typecheck']], ['lint', ['run', 'lint']], ['test', ['test']], ['html', ['run', 'qa:html']], ['performance', ['run', 'qa:performance']]];
for (const [name, args] of stages) {
  const startedAt = new Date().toISOString();
  const path = `docs/qa/${name}.log`;
  const log = createWriteStream(path);
  const child = spawn('npm', args, { env: { ...process.env, SEO_QA_MODE: 'true', NETWORK_LINKS_ENABLED: 'false', NEXT_TELEMETRY_DISABLED: '1', NO_COLOR: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log); child.stderr.pipe(log);
  const exitCode = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', (code, signal) => resolve(code ?? 128 + (constants.signals[signal] ?? 0))); });
  await new Promise(resolve => log.end(resolve));
  const raw = await readFile(path, 'utf8');
  const ascii = raw.replace(/\u001b\[[0-9;?]*[A-Za-z]/g, '').replace(/[^\x09\x0a\x0d\x20-\x7e]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
  await writeFile(path, ascii);
  results.push({ command: `npm ${args.join(' ')}`, startedAt, finishedAt: new Date().toISOString(), exitCode, log: path });
  await writeFile('docs/qa/checks.json', JSON.stringify({ node: process.version, results }, null, 2) + '\n');
  console.log(`${exitCode === 0 ? 'PASS' : 'FAIL'}: npm ${args.join(' ')}`);
  if (exitCode !== 0) process.exit(1);
}
