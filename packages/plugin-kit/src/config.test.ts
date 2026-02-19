import { describe, expect, test } from 'vitest';

import { createCollectionConfigFactory } from './config';

describe('createCollectionConfigFactory', () => {
  test('produces config with slug from an object factory', () => {
    const factory = createCollectionConfigFactory<Record<string, never>>({
      labels: { singular: 'Item', plural: 'Items' },
      fields: [],
    });

    // @ts-expect-error - TODO: fix this
    const config = factory({ slug: 'items' });
    expect(config.slug).toBe('items');
    expect(config.labels).toEqual({ singular: 'Item', plural: 'Items' });
  });

  test('produces config with slug from a function factory', () => {
    const factory = createCollectionConfigFactory<{ prefix: string }>(
      ({ prefix }) => ({
        labels: { singular: `${prefix} Item`, plural: `${prefix} Items` },
        fields: [],
      }),
    );

    const config = factory({ slug: 'items' as any, prefix: 'Custom' });
    expect(config.slug).toBe('items');
    expect(config.labels).toEqual({
      singular: 'Custom Item',
      plural: 'Custom Items',
    });
  });
});
