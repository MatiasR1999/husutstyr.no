import type { Metadata } from 'next';
import type { RuntimeConfig } from '../config';

export function robotsPolicy(config: RuntimeConfig, options: { missing?: boolean; facet?: boolean; belowThreshold?:boolean } = {}): NonNullable<Metadata['robots']> {
  return { index: !(config.qa || config.preview || options.missing || options.facet || options.belowThreshold), follow: !options.missing };
}
export function robotsHeaders(config: RuntimeConfig): Record<string, string> {
  return config.qa || config.preview ? { 'X-Robots-Tag': 'noindex, follow' } : {};
}
