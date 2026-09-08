import site from '../../site.config';
import type { SiteIdentity } from './site-types';

export type Environment = Readonly<Record<string, string | undefined>>;
export interface RuntimeConfig { readonly qa: boolean; readonly networkLinks: boolean; readonly preview: boolean; readonly identity: SiteIdentity }

export function parseBoolean(value: string | undefined, name: string): boolean {
  if (value === undefined || value === 'false') return false;
  if (value === 'true') return true;
  throw new Error(`${name} must be exactly true or false`);
}

export function readRuntimeConfig(env: Environment): RuntimeConfig {
  const qa = parseBoolean(env.SEO_QA_MODE, 'SEO_QA_MODE');
  if (qa && (env.VERCEL !== undefined || env.VERCEL_ENV !== undefined)) {
    throw new Error('Local QA fixtures cannot run on Vercel');
  }
  return { qa, networkLinks: parseBoolean(env.NETWORK_LINKS_ENABLED, 'NETWORK_LINKS_ENABLED'), preview: env.VERCEL_ENV === 'preview', identity: qa ? site.qa.identity : site.identity };
}

export function assertQaContentAllowed(config: RuntimeConfig): void {
  if (config.qa) return;
  if (!config.identity.url || !process.env.SITE_URL || process.env.SITE_URL !== config.identity.url || !process.env.DATABASE_URL || [config.identity.name, site.niche, site.toneOfVoice].some(value => !value || value.includes('TODO:'))) throw new Error('Production requires SITE_URL, restricted database access and completed site identity.');
  if (new URL(config.identity.url).protocol !== 'https:' || new URL(process.env.DATABASE_URL).username !== 'seo_public_reader') throw new Error('Invalid production origin or database role');
}

export function isLocalRequest(url: URL): boolean {
  return ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
}
