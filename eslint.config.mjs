import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  // Native anchors keep this reading-only phase usable without client navigation.
  { rules: { '@typescript-eslint/no-explicit-any': 'error', '@next/next/no-html-link-for-pages': 'off' } },
  globalIgnores(['.next/**', 'node_modules/**', 'work/**', 'next-env.d.ts', 'docs/**']),
]);
