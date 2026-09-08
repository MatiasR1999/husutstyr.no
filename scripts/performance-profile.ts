export const performanceProfile = {
  // The approved 140000-byte exception applies only to phase 1 (spec decision 6).
  scope: 'phase-1',
  viewport: { width: 390, height: 844 },
  cpuSlowdown: 4,
  latencyMs: 150,
  downloadBytesPerSecond: 1_600_000 / 8,
  uploadBytesPerSecond: 750_000 / 8,
  samples: 5,
  limits: { lcpMs: 2000, cls: 0.1, ttfbMs: 600, interactionMs: 200, initialJsGzipBytes: 140000 },
} as const;

// Final-template decision 6 approved by the user on 2026-09-08; cache states and other limits are unchanged.
export const finalTemplateProfile = {
  ...performanceProfile,
  scope: 'final-template',
  limits: { ...performanceProfile.limits, initialJsGzipBytes: 165000 },
} as const;

export function percentile75(values: number[]): number {
  if (!values.length || values.some(value => !Number.isFinite(value))) throw new Error('Missing or invalid measurement');
  return [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.75) - 1]!;
}
