import { neonConfig } from '@neondatabase/serverless';
import { fetchWithConnectionRetry } from '../src/lib/db/transport';
// QA and provisioning scripts talk to Neon directly, so they need the same retry the application transport uses.
// Without it a transient "Couldn't connect to compute node", which Neon itself marks retryable, aborts a whole suite run.
neonConfig.fetchFunction = fetchWithConnectionRetry;
