import { describe, expect, test, vi } from 'vitest';

vi.mock('next/cache', () => ({
  cacheTag: vi.fn(),
}));

// @ts-expect-error — cacheTag is not exported in Next.js 15 types
import { cacheTag } from 'next/cache';
import { tenantCacheTag } from './cache';

describe('tenantCacheTag', () => {
  test('calls cacheTag with slug and tenant-scoped tag', () => {
    vi.mocked(cacheTag).mockClear();

    tenantCacheTag('posts', 'tenant-abc');

    expect(cacheTag).toHaveBeenCalledWith('posts', 'posts:tenant-abc');
  });

  test('accepts multiple slugs', () => {
    vi.mocked(cacheTag).mockClear();

    tenantCacheTag(['posts', 'media'], 'tenant-abc');

    expect(cacheTag).toHaveBeenCalledWith(
      'posts',
      'posts:tenant-abc',
      'media',
      'media:tenant-abc',
    );
  });
});
