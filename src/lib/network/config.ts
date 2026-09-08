import 'server-only';
import {createHash} from 'node:crypto';
import site from '@site';
import {readRuntimeConfig} from '../config';
import {registrySchema} from './policy';
export function networkRegistry(){
 const runtime=readRuntimeConfig(process.env);
 if(!runtime.networkLinks)return null;
 return registrySchema.parse(runtime.qa?site.qa.network:site.network);
}
export function networkCacheMode(){const registry=networkRegistry();return registry?`on-${registry.version}-${createHash('sha256').update(JSON.stringify(registry)).digest('hex').slice(0,16)}`:'off';}
