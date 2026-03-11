import { findFields } from '@davincicoding/payload-plugin-kit';
import type { CollectionConfig, CollectionSlug, Field } from 'payload';

/**
 * Determines which collections have the tenant field by scanning their field configs.
 * Returns a Set of collection slugs that are tenant-tenantScopedSlugs.
 *
 * Only matches top-level field names (or fields inside unnamed containers like
 * unnamed tabs/rows). Fields nested inside named groups/tabs don't match because
 * the multi-tenant plugin adds the tenant field at the top level.
 */
export function getTenantScopedCollections(
  collections: CollectionConfig[],
  tenantField: string | undefined,
): Set<CollectionSlug> {
  if (!tenantField) return new Set();

  const tenantScopedSlugs = new Set<CollectionSlug>();

  for (const collection of collections) {
    const match = findFields(collection.fields, (f: Field) => {
      return 'name' in f && f.name === tenantField;
    });

    // Only consider fields whose path is exactly [tenantField] — i.e. top-level
    const hasTopLevelTenantField = match.some(
      (f) => f.path.length === 1 && f.path[0] === tenantField,
    );

    if (hasTopLevelTenantField) {
      tenantScopedSlugs.add(collection.slug as CollectionSlug);
    }
  }

  return tenantScopedSlugs;
}
