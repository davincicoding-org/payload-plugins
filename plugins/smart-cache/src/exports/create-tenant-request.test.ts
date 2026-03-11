import { describe, expect, test, vi } from 'vitest';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn, _keyParts, _options) => fn),
}));

import { unstable_cache } from 'next/cache';
import { createTenantRequestHandler } from './create-tenant-request';

describe('createTenantRequestHandler', () => {
  test('calls handler with all arguments', async () => {
    const handler = vi.fn(async (tenantId: string, slug: string) => ({
      tenantId,
      slug,
    }));
    const tagsFn = (tenantId: string) => ['posts', `posts:${tenantId}`];

    const cached = createTenantRequestHandler(handler, tagsFn);
    const result = await cached('tenant-abc', 'my-post');

    expect(result).toEqual({ tenantId: 'tenant-abc', slug: 'my-post' });
  });

  test('creates unstable_cache wrapper with tenant-scoped tags', async () => {
    vi.mocked(unstable_cache).mockClear();

    const handler = vi.fn(async () => ({}));
    const tagsFn = (tenantId: string) => ['posts', `posts:${tenantId}`];

    const cached = createTenantRequestHandler(handler, tagsFn);
    await cached('tenant-abc');

    expect(unstable_cache).toHaveBeenCalledWith(handler, ['tenant-abc'], {
      tags: ['posts', 'posts:tenant-abc'],
      revalidate: false,
    });
  });

  test('memoizes wrapper per tenant — does not recreate for same tenant', async () => {
    vi.mocked(unstable_cache).mockClear();

    const handler = vi.fn(async () => ({}));
    const tagsFn = () => ['posts'];

    const cached = createTenantRequestHandler(handler, tagsFn);
    await cached('tenant-abc');
    await cached('tenant-abc');

    expect(unstable_cache).toHaveBeenCalledTimes(1);
  });

  test('creates separate wrappers for different tenants', async () => {
    vi.mocked(unstable_cache).mockClear();

    const handler = vi.fn(async () => ({}));
    const tagsFn = (tenantId: string) => [`posts:${tenantId}`];

    const cached = createTenantRequestHandler(handler, tagsFn);
    await cached('tenant-abc');
    await cached('tenant-def');

    expect(unstable_cache).toHaveBeenCalledTimes(2);
  });

  test('passes revalidate option through', async () => {
    vi.mocked(unstable_cache).mockClear();

    const handler = vi.fn(async () => ({}));
    const tagsFn = () => ['posts'];

    const cached = createTenantRequestHandler(handler, tagsFn, {
      revalidate: 3600,
    });
    await cached('tenant-abc');

    expect(unstable_cache).toHaveBeenCalledWith(handler, ['tenant-abc'], {
      tags: ['posts'],
      revalidate: 3600,
    });
  });
});
