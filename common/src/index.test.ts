import { describe, expect, test } from 'vitest';

import {
  assertPopulated,
  createCollectionConfigFactory,
  entityIdSchema,
  isPopulated,
  resolveForeignKey,
} from './index';

describe('entityIdSchema', () => {
  test('validates numbers', () => {
    expect(entityIdSchema.safeParse(42).success).toBe(true);
  });

  test('validates strings', () => {
    expect(entityIdSchema.safeParse('abc-123').success).toBe(true);
  });

  test('rejects objects', () => {
    expect(entityIdSchema.safeParse({ id: 1 }).success).toBe(false);
  });

  test('rejects booleans', () => {
    expect(entityIdSchema.safeParse(true).success).toBe(false);
  });

  test('rejects null', () => {
    expect(entityIdSchema.safeParse(null).success).toBe(false);
  });
});

describe('isPopulated', () => {
  test('returns true for objects', () => {
    expect(isPopulated({ id: 1, name: 'Test' })).toBe(true);
  });

  test('returns false for number IDs', () => {
    expect(isPopulated(1)).toBe(false);
  });

  test('returns false for string IDs', () => {
    expect(isPopulated('abc-123')).toBe(false);
  });
});

describe('assertPopulated', () => {
  test('returns populated entity when given an object', () => {
    const entity = { id: 1, name: 'Test' };
    expect(assertPopulated(entity)).toBe(entity);
  });

  test('throws for a primitive ID', () => {
    expect(() => assertPopulated(42)).toThrow('Doc is not populated: [42]');
  });

  test('handles arrays of populated entities', () => {
    const entities = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ];
    expect(assertPopulated(entities)).toEqual(entities);
  });

  test('throws for arrays containing unpopulated IDs', () => {
    const mixed = [{ id: 1, name: 'A' }, 99] as Array<
      { id: number; name: string } | number
    >;
    expect(() => assertPopulated(mixed)).toThrow('Doc is not populated: [99]');
  });

  test('returns null when given null', () => {
    expect(assertPopulated(null)).toBeNull();
  });

  test('supports custom error message', () => {
    expect(() => assertPopulated(42, (id) => `Missing: ${id}`)).toThrow(
      'Missing: 42',
    );
  });
});

describe('resolveForeignKey', () => {
  test('extracts ID from a populated object', () => {
    expect(resolveForeignKey({ id: 5, name: 'Test' })).toBe(5);
  });

  test('returns number primitive as-is', () => {
    expect(resolveForeignKey(5)).toBe(5);
  });

  test('returns string primitive as-is', () => {
    expect(resolveForeignKey('abc')).toBe('abc');
  });
});

describe('createCollectionConfigFactory', () => {
  test('produces config with slug from an object factory', () => {
    const factory = createCollectionConfigFactory<Record<string, never>>({
      labels: { singular: 'Item', plural: 'Items' },
      fields: [],
    });

    const config = factory({ slug: 'items' as any });
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
