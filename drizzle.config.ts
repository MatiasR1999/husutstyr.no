import { defineConfig } from 'drizzle-kit';

// Generation is offline. Migration scripts require a separately verified test URL.
export default defineConfig({ dialect: 'postgresql', schema: './src/lib/db/schema.ts', out: './drizzle', strict: true });
