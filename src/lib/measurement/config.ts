import 'server-only';
import site from '@site';
import type {Environment,RuntimeConfig} from '../config';
import {isLocalRequest} from '../config';
import type {MeasurementRuntime} from '../site-types';

export function measurementRuntime(runtime:RuntimeConfig,env:Environment):MeasurementRuntime {
  const localTest=runtime.qa&&!runtime.preview&&!env.VERCEL&&!env.VERCEL_ENV&&isLocalRequest(new URL(runtime.identity.url));
  const production=!runtime.qa&&!runtime.preview&&env.VERCEL_ENV==='production'&&site.measurement.enabled;
  const collector=new URL(site.qa.phase5.collectorOrigin);
  if(localTest&&!isLocalRequest(collector))throw new Error('QA measurement requires a loopback collector');
  return {...site.measurement,mode:localTest?'local-test':production?'production':'off',origin:runtime.identity.url,
    affiliateOrigins:localTest?[site.qa.phase5.destinationOrigin]:site.affiliate.allowedOrigins,
    ...(localTest?{analyticsScript:`${collector.origin}/analytics.js`,analyticsEndpoint:`${collector.origin}/analytics`,speedScript:`${collector.origin}/speed.js`,speedEndpoint:`${collector.origin}/vitals`}:{}),
  };
}
