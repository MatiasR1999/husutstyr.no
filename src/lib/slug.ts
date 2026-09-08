import site from '@site';

export function normalizeSlug(input: string): string {
  const slug = input.normalize('NFC').toLowerCase().replace(/\u00e6/g, 'ae').replace(/\u00f8/g, 'o').replace(/\u00e5/g, 'a')
    .normalize('NFKD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, site.routes.maxSlugLength).replace(/-+$/g, '');
  if (!slug) throw new Error('Slug requires editorial input');
  return slug;
}

export function slugCandidate(base: string, attempt: number): string {
  if (!Number.isSafeInteger(attempt) || attempt < 1) throw new Error('Invalid collision attempt');
  const normalized = normalizeSlug(base);
  const suffix = attempt === 1 ? '' : `-${attempt}`;
  return normalized.slice(0, site.routes.maxSlugLength - suffix.length).replace(/-+$/g, '') + suffix;
}

// Phase 2 supplies an atomic INSERT protected by a UNIQUE database constraint.
export async function reserveSlug(input: string, tryReserve: (candidate: string) => Promise<boolean>): Promise<string> {
  for (let attempt = 1; attempt <= 10000; attempt++) {
    const candidate = slugCandidate(input, attempt);
    if (await tryReserve(candidate)) return candidate;
  }
  throw new Error('Slug reservation limit reached');
}

export function isPublicSlug(slug: string): boolean {
  return slug.length <= site.routes.maxSlugLength && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
