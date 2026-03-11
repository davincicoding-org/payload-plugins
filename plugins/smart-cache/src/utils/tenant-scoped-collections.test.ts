import type { CollectionConfig } from 'payload';
import { describe, expect, test } from 'vitest';
import { getTenantScopedCollections } from './tenant-scoped-collections';

function makeCollection(
  slug: string,
  fields: CollectionConfig['fields'] = [],
): CollectionConfig {
  return { slug, fields } as CollectionConfig;
}

describe('getTenantScopedCollections', () => {
  test('returns empty set when tenantField is undefined', () => {
    const result = getTenantScopedCollections(
      [
        makeCollection('posts', [
          { name: 'camp', type: 'relationship', relationTo: 'tenants' },
        ]),
      ],
      undefined,
    );
    expect(result.size).toBe(0);
  });

  test('detects collections with a matching top-level field', () => {
    const result = getTenantScopedCollections(
      [
        makeCollection('posts', [
          { name: 'camp', type: 'relationship', relationTo: 'tenants' },
        ]),
        makeCollection('events', [{ name: 'title', type: 'text' }]),
      ],
      'camp',
    );
    expect(result).toEqual(new Set(['posts']));
  });

  test('detects field nested in an unnamed tab', () => {
    const result = getTenantScopedCollections(
      [
        makeCollection('posts', [
          {
            type: 'tabs',
            tabs: [
              {
                label: 'Main',
                fields: [
                  { name: 'camp', type: 'relationship', relationTo: 'tenants' },
                ],
              },
            ],
          },
        ]),
      ],
      'camp',
    );
    expect(result).toEqual(new Set(['posts']));
  });

  test('does not match fields nested in named groups', () => {
    const result = getTenantScopedCollections(
      [
        makeCollection('posts', [
          {
            name: 'meta',
            type: 'group',
            fields: [
              { name: 'camp', type: 'relationship', relationTo: 'tenants' },
            ],
          },
        ]),
      ],
      'camp',
    );
    expect(result.size).toBe(0);
  });
});
