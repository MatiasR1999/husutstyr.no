import type { Metadata } from 'next';
import site from '@site';
export const privateHeaders={ 'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow' };
export function privateMetadata():Metadata { return {title:{absolute:site.editorial.ui.title},robots:{index:false,follow:false},alternates:{canonical:null},openGraph:null,twitter:null,description:null}; }
