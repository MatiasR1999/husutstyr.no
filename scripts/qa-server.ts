import {neonConfig} from '@neondatabase/serverless';
import {fetchWithConnectionRetry} from '../src/lib/db/transport';
import { spawn, type ChildProcess } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { once } from 'node:events';
import site from '../site.config';

neonConfig.fetchFunction=fetchWithConnectionRetry;

export async function startQaServer(label: string, qa = true, preview = false, network: 'false'|'true'|'unset' = 'false'): Promise<{ child: ChildProcess; stop: () => Promise<void> }> {
  await mkdir('work', { recursive: true });
  const log = createWriteStream(`work/${label}-server.log`);
  const origin = new URL(site.qa.identity.url);
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', origin.hostname, '--port', origin.port], {
    // Isolate the local test server from termination signals sent to other command process groups.
    detached: true,
    env: { ...process.env, DATABASE_URL_UNPOOLED: '', SEO_QA_MODE: String(qa), NETWORK_LINKS_ENABLED: network==='unset'?undefined:network, ...(preview ? { VERCEL_ENV: 'preview' } : {}) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.pipe(log, { end: false }); child.stderr?.pipe(log, { end: false });
  let requestedStop = false;
  child.once('exit', (code, signal) => log.write(`\nQA_SERVER_EXIT: code=${code} signal=${signal} requestedStop=${requestedStop}\n`));
  let output = '';
  child.stdout?.on('data', chunk => { output += String(chunk); });
  child.stderr?.on('data', chunk => { output += String(chunk); });
  for (let attempt = 0; attempt < 150; attempt++) {
    if (child.exitCode !== null) throw new Error(`QA server exited: ${output}`);
    if (output.includes('Ready in')) break;
    await delay(100);
    if (attempt === 149) { child.kill(); throw new Error('QA server readiness timeout'); }
  }
  return { child, stop: async () => {
    requestedStop = true;
    if (child.exitCode === null && child.signalCode === null) {
      const closed = once(child, 'close');
      const timeout = setTimeout(() => child.kill('SIGKILL'), 5000);
      timeout.unref();
      child.kill('SIGTERM');
      await closed;
      clearTimeout(timeout);
    }
    log.end();
  } };
}
