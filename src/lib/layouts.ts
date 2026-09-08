import site from '@site';
import {readRuntimeConfig} from './config';
export function layoutVariants() {
 const runtime=readRuntimeConfig(process.env),value=process.env.QA_LAYOUT_VARIANT;
 if(value&&!runtime.qa) throw new Error('Layout overrides require local QA');
 if(value&&!['1','2','3'].includes(value)) throw new Error('Invalid QA layout variant');
 return value==='1'?{home:'index',article:'classic'} as const:value==='2'?{home:'magazine',article:'editorial'} as const:value==='3'?{home:'directory',article:'reference'} as const:site.layouts;
}
