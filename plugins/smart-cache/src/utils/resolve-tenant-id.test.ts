import { describe, expect, test } from 'vitest';
import { resolveTenantId } from './resolve-tenant-id';

describe('resolveTenantId', () => {
  test('returns undefined when tenantField is not set', () => {
    expect(
      resolveTenantId({ id: '1', title: 'test' }, undefined),
    ).toBeUndefined();
  });

  test('returns undefined when doc lacks tenant field', () => {
    expect(resolveTenantId({ id: '1', title: 'test' }, 'camp')).toBeUndefined();
  });

  test('extracts string tenant ID directly', () => {
    expect(resolveTenantId({ id: '1', camp: 'tenant-abc' }, 'camp')).toBe(
      'tenant-abc',
    );
  });

  test('extracts number tenant ID as string', () => {
    expect(resolveTenantId({ id: '1', camp: 42 }, 'camp')).toBe('42');
  });

  test('extracts tenant ID from populated relationship object', () => {
    expect(
      resolveTenantId(
        { id: '1', camp: { id: 'tenant-abc', name: 'Sparkle' } },
        'camp',
      ),
    ).toBe('tenant-abc');
  });

  test('returns undefined for null tenant value', () => {
    expect(resolveTenantId({ id: '1', camp: null }, 'camp')).toBeUndefined();
  });
});
