import site from '@site';
import {readRuntimeConfig} from '@/lib/config';
import {pageMetadata} from './metadata';

// Metadata for the publisher's own-sites page. It lives here because the architecture rules keep canonical
// and robots handling inside src/lib/seo, not in route files.
export function ownedSitesMetadata() {
  return pageMetadata(readRuntimeConfig(process.env), site.ownedSites.path, site.ownedSites.seo, {kind:'page'});
}
