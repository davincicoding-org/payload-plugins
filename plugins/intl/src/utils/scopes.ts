import type { NormalizedScope, Scopes } from '../types';

export type { NormalizedScope };

export function normalizeScopes(
  scopes: Scopes | undefined,
): Map<string, NormalizedScope> {
  const result = new Map<string, NormalizedScope>();
  if (!scopes) return result;

  if (Array.isArray(scopes)) {
    for (const slug of scopes) {
      result.set(slug, { position: 'tab' });
    }
    return result;
  }

  for (const [slug, config] of Object.entries(scopes)) {
    if (typeof config === 'string') {
      result.set(slug, { position: config });
    } else {
      result.set(slug, config);
    }
  }
  return result;
}
