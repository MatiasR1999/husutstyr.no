import {spawn} from 'node:child_process';
import {parseEnv} from 'node:util';
import {readFile} from 'node:fs/promises';
const runtime=parseEnv(await readFile('.env.phase3.local','utf8')),owner=parseEnv(await readFile('.env.test.local','utf8'));
const child=spawn(process.execPath,['--import','tsx','scripts/phase3/http-test.ts'],{env:{...process.env,...runtime,DATABASE_URL_UNPOOLED:owner.DATABASE_URL_UNPOOLED,QA_EVIDENCE_DIR:'docs/qa/phase4',NODE_OPTIONS:'--dns-result-order=ipv4first'},stdio:'inherit'});
child.on('close',code=>process.exit(code??1));
