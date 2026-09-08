import 'server-only';
import {fetchWithConnectionRetry} from './transport';
import { neon,neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

neonConfig.fetchFunction=fetchWithConnectionRetry;

// Server-only HTTP access; roles and transactional procedures enforce write boundaries.
export function createDatabase(connectionString: string) {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Expected PostgreSQL connection string');
  return drizzle(neon(connectionString));
}
