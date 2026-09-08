import site from './site.config';
import type { NextConfig } from 'next';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { assertQaContentAllowed, readRuntimeConfig } from './src/lib/config';
import { htmlLimitedBots } from './src/lib/seo/framework-policy';

export default function nextConfig(phase: string): NextConfig {
  const config = readRuntimeConfig(process.env);
  if (phase === PHASE_PRODUCTION_BUILD) assertQaContentAllowed(config);
  const qaImage = new URL(site.qa.phase7.imageUrl);
  return {
    agentRules: false,
    turbopack: { root: process.cwd() },
    poweredByHeader: false,
    skipTrailingSlashRedirect: true,
    skipProxyUrlNormalize: true,
    htmlLimitedBots,
    images: {
      formats: ['image/avif', 'image/webp'],
      // The image load test has one loopback origin; production never permits local IPs.
      dangerouslyAllowLocalIP: config.qa,
      remotePatterns: [...site.media.remotePatterns, ...(config.qa ? [{protocol:'http' as const,hostname:qaImage.hostname,port:qaImage.port,pathname:qaImage.pathname,search:''}] : [])],
    },
    // Phase 1 uses the traditional ISR model; no Cache Components or PPR.
    cacheComponents: false,
  };
}
