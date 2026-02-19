import { describe, expect, test } from 'vitest';

import {
  assertPopulated,
  documentIdSchema,
  isPopulated,
  resolveDocumentID,
  uncaughtSwitchCase,
} from './index';

describe('entityIdSchema', () => {
  test('validates numbers', () => {
    expect(documentIdSchema.safeParse(42).success).toBe(true);
  });

  test('validates strings', () => {
    expect(documentIdSchema.safeParse('abc-123').success).toBe(true);
  });

  test('rejects objects', () => {
    expect(documentIdSchema.safeParse({ id: 1 }).success).toBe(false);
  });

  test('rejects booleans', () => {
    expect(documentIdSchema.safeParse(true).success).toBe(false);
  });

  test('rejects null', () => {
    expect(documentIdSchema.safeParse(null).success).toBe(false);
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

describe('resolveDocumentID', () => {
  test('extracts ID from a populated object', () => {
    expect(resolveDocumentID({ id: 5 })).toBe(5);
  });

  test('returns number primitive as-is', () => {
    expect(resolveDocumentID(5)).toBe(5);
  });

  test('returns string primitive as-is', () => {
    expect(resolveDocumentID('abc')).toBe('abc');
  });
});

describe('uncaughtSwitchCase', () => {
  test('throws error with the value', () => {
    expect(() => uncaughtSwitchCase('oops' as never)).toThrow(
      'Unhandled switch case: oops',
    );
  });
});
