import type { MessagesScopesConfig, ScopeConfig } from '../types';

export function normalizeScopes(
  scopes: MessagesScopesConfig | undefined,
): Map<string, ScopeConfig> {
  const result = new Map<string, ScopeConfig>();
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
