import {spawn} from 'node:child_process';
import {parseEnv} from 'node:util';
import {readFile} from 'node:fs/promises';
const env={...process.env,...parseEnv(await readFile('.env.phase3.local','utf8')),DATABASE_URL_UNPOOLED:'',NODE_OPTIONS:'--dns-result-order=ipv4first'};
const child=spawn('npm',['run','build'],{env,stdio:'inherit'});
child.on('close',code=>process.exit(code??1));
