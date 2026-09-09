// Local guard only. It is never part of npm run build, because the hosted runtime is allowed to be a patch behind the pinned local version.
import {readFile} from 'node:fs/promises';
const expected=(await readFile('.nvmrc','utf8')).trim(),actual=process.versions.node;
const parse=value=>value.split('.').map(Number);
const [eMajor,eMinor,ePatch]=parse(expected),[aMajor,aMinor,aPatch]=parse(actual);
const older=aMajor<eMajor||(aMajor===eMajor&&(aMinor<eMinor||(aMinor===eMinor&&aPatch<ePatch)));
if(older){console.error(`BLOCKED: Evidence is recorded on Node ${expected}, but this process runs ${actual}. Run "nvm use" first.`);process.exit(1);}
console.log(`PASS: Node ${actual} meets the recorded ${expected} baseline.`);
