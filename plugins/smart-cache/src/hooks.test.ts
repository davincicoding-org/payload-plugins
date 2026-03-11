import type {
  BasePayload,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionSlug,
  GlobalAfterChangeHook,
  GlobalSlug,
} from 'payload';
import { describe, expect, test, vi } from 'vitest';

import {
  invalidateCollectionCache,
  invalidateCollectionCacheOnDelete,
  invalidateGlobalCache,
} from './hooks';
import type { DocumentInvalidationCallback, DocumentWithStatus } from './types';

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

import { revalidateTag } from 'next/cache';

type AfterChangeArgs = Parameters<
  CollectionAfterChangeHook<DocumentWithStatus>
>[0];
type AfterDeleteArgs = Parameters<
  CollectionAfterDeleteHook<DocumentWithStatus>
>[0];
type GlobalAfterChangeArgs = Parameters<GlobalAfterChangeHook>[0];

function makePayload(): BasePayload {
  return {} as BasePayload;
}

function makeCollectionHookConfig(
  overrides: { invalidationCallback?: DocumentInvalidationCallback } = {},
) {
  return {
    graph: { getDependants: () => [] } as any,
    invalidationCallback: overrides.invalidationCallback,
  };
}

function makeCollectionAfterChangeArgs(
  overrides: Partial<AfterChangeArgs> & {
    slug?: string;
    drafts?: boolean;
    _status?: string;
    previousStatus?: string;
  },
): AfterChangeArgs {
  const {
    slug = 'posts',
    drafts = false,
    _status,
    previousStatus,
    ...rest
  } = overrides;

  return {
    req: { payload: makePayload(), context: {} },
    doc: { id: '1', ...(_status != null ? { _status } : {}) },
    previousDoc: {
      id: '1',
      ...(previousStatus != null ? { _status: previousStatus } : {}),
    },
    collection: {
      slug: slug as CollectionSlug,
      ...(drafts ? { versions: { drafts: true } } : {}),
    },
    context: {},
    operation: 'update',
    ...rest,
  } as unknown as AfterChangeArgs;
}

function makeCollectionAfterDeleteArgs(
  overrides: { slug?: string } = {},
): AfterDeleteArgs {
  const { slug = 'posts' } = overrides;
  return {
    req: { payload: makePayload(), context: {} },
    doc: { id: '42' },
    collection: { slug: slug as CollectionSlug },
    context: {},
    id: '42',
  } as unknown as AfterDeleteArgs;
}

function makeGlobalAfterChangeArgs(
  overrides: { slug?: string } = {},
): GlobalAfterChangeArgs {
  const { slug = 'nav' } = overrides;
  return {
    global: { slug: slug as GlobalSlug },
    doc: {},
    previousDoc: {},
    req: { payload: makePayload(), context: {} },
    context: {},
  } as unknown as GlobalAfterChangeArgs;
}

describe('invalidateCollectionCache', () => {
  test('revalidates tag for non-draft collection on every save', async () => {
    vi.mocked(revalidateTag).mockClear();

    const hook = invalidateCollectionCache(makeCollectionHookConfig());

    await hook(makeCollectionAfterChangeArgs({}));

    expect(revalidateTag).toHaveBeenCalledWith('posts');
  });

  test('does NOT revalidate when draft save and not publishing', async () => {
    vi.mocked(revalidateTag).mockClear();

    const hook = invalidateCollectionCache(makeCollectionHookConfig());

    await hook(
      makeCollectionAfterChangeArgs({
        drafts: true,
        _status: 'draft',
      }),
    );

    expect(revalidateTag).not.toHaveBeenCalled();
  });

  test('revalidates when publishing a draft', async () => {
    vi.mocked(revalidateTag).mockClear();

    const hook = invalidateCollectionCache(makeCollectionHookConfig());

    await hook(
      makeCollectionAfterChangeArgs({
        drafts: true,
        _status: 'published',
        previousStatus: 'draft',
      }),
    );

    expect(revalidateTag).toHaveBeenCalledWith('posts');
  });

  test('revalidates when re-saving an already published doc', async () => {
    vi.mocked(revalidateTag).mockClear();

    const hook = invalidateCollectionCache(makeCollectionHookConfig());

    await hook(
      makeCollectionAfterChangeArgs({
        drafts: true,
        _status: 'published',
        previousStatus: 'published',
      }),
    );

    expect(revalidateTag).toHaveBeenCalledWith('posts');
  });
});

describe('invalidateCollectionCacheOnDelete', () => {
  test('always revalidates tag on delete', async () => {
    vi.mocked(revalidateTag).mockClear();

    const hook = invalidateCollectionCacheOnDelete({
      graph: { getDependants: () => [] } as any,
      invalidationCallback: () => void 0,
    });

    await hook(makeCollectionAfterDeleteArgs());

    expect(revalidateTag).toHaveBeenCalledWith('posts');
  });
});

describe('invalidateGlobalCache', () => {
  test('revalidates tag with global slug and fires callback', async () => {
    vi.mocked(revalidateTag).mockClear();
    const invalidationCallback = vi.fn();

    const hook = invalidateGlobalCache(invalidationCallback);

    await hook(makeGlobalAfterChangeArgs());

    expect(revalidateTag).toHaveBeenCalledWith('nav');
    expect(invalidationCallback).toHaveBeenCalledWith({
      type: 'global',
      slug: 'nav',
    });
  });
});

describe('invalidationCallback', () => {
  test('fires callback for any collection (filtering is in wrapper)', async () => {
    vi.mocked(revalidateTag).mockClear();
    const invalidationCallback = vi.fn();

    const hook = invalidateCollectionCache(
      makeCollectionHookConfig({ invalidationCallback }),
    );

    await hook(makeCollectionAfterChangeArgs({ slug: 'media' }));

    expect(revalidateTag).toHaveBeenCalledWith('media');
    expect(invalidationCallback).toHaveBeenCalledWith({
      type: 'collection',
      slug: 'media',
      docID: '1',
      tenantId: undefined,
    });
  });

  test('fires callback for registered collections', async () => {
    vi.mocked(revalidateTag).mockClear();
    const invalidationCallback = vi.fn();

    const hook = invalidateCollectionCache(
      makeCollectionHookConfig({ invalidationCallback }),
    );

    await hook(makeCollectionAfterChangeArgs({ slug: 'posts' }));

    expect(invalidationCallback).toHaveBeenCalledWith({
      type: 'collection',
      slug: 'posts',
      docID: '1',
      tenantId: undefined,
    });
  });
});

describe('tenant-scoped invalidation', () => {
  const tenantScopedCollections = new Set([
    'posts' as CollectionSlug,
    'media' as CollectionSlug,
  ]);

  function makeTenantHookConfig(
    overrides: { invalidationCallback?: DocumentInvalidationCallback } = {},
  ) {
    return {
      graph: { getDependants: () => [] } as any,
      invalidationCallback: overrides.invalidationCallback,
      tenantField: 'camp',
      tenantScopedCollections,
    };
  }

  test('emits tenant-scoped tag when doc has tenant value', async () => {
    vi.mocked(revalidateTag).mockClear();

    const hook = invalidateCollectionCache(makeTenantHookConfig());
    const args = makeCollectionAfterChangeArgs({ slug: 'posts' });
    (args.doc as any).camp = 'tenant-abc';

    await hook(args);

    expect(revalidateTag).toHaveBeenCalledWith('posts:tenant-abc');
    expect(revalidateTag).not.toHaveBeenCalledWith('posts');
  });

  test('falls back to collection-level tag when doc has no tenant value', async () => {
    vi.mocked(revalidateTag).mockClear();

    const hook = invalidateCollectionCache(makeTenantHookConfig());
    await hook(makeCollectionAfterChangeArgs({ slug: 'posts' }));

    expect(revalidateTag).toHaveBeenCalledWith('posts');
  });

  test('emits collection-level tag for non-tenant-scoped collection', async () => {
    vi.mocked(revalidateTag).mockClear();

    const hook = invalidateCollectionCache({
      graph: { getDependants: () => [] } as any,
      invalidationCallback: undefined,
      tenantField: 'camp',
      tenantScopedCollections: new Set(['posts' as CollectionSlug]),
    });

    await hook(makeCollectionAfterChangeArgs({ slug: 'events' }));

    expect(revalidateTag).toHaveBeenCalledWith('events');
  });

  test('passes tenantId to invalidation callback', async () => {
    vi.mocked(revalidateTag).mockClear();
    const invalidationCallback = vi.fn();

    const hook = invalidateCollectionCache(
      makeTenantHookConfig({ invalidationCallback }),
    );

    const args = makeCollectionAfterChangeArgs({ slug: 'posts' });
    (args.doc as any).camp = 'tenant-abc';

    await hook(args);

    expect(invalidationCallback).toHaveBeenCalledWith({
      type: 'collection',
      slug: 'posts',
      docID: '1',
      tenantId: 'tenant-abc',
    });
  });

  test('delete hook emits tenant-scoped tag', async () => {
    vi.mocked(revalidateTag).mockClear();

    const hook = invalidateCollectionCacheOnDelete({
      graph: { getDependants: () => [] } as any,
      invalidationCallback: () => void 0,
      tenantField: 'camp',
      tenantScopedCollections,
    });

    const args = makeCollectionAfterDeleteArgs({ slug: 'posts' });
    (args.doc as any).camp = 'tenant-abc';

    await hook(args);

    expect(revalidateTag).toHaveBeenCalledWith('posts:tenant-abc');
  });
});

describe('cross-boundary dependency walks', () => {
  test('tenant-scoped → shared: drops tenant filter for shared dependent', async () => {
    vi.mocked(revalidateTag).mockClear();

    const tenantScopedCollections = new Set(['posts' as CollectionSlug]);
    // 'events' is NOT in tenantScopedCollections (shared)
    const findMock = vi.fn().mockResolvedValue({ docs: [{ id: '99' }] });

    const hook = invalidateCollectionCache({
      graph: {
        getDependants: (slug: string) => {
          if (slug === 'posts') {
            return [
              {
                entity: { type: 'collection', slug: 'events' },
                fields: [
                  { field: 'relatedPost', hasMany: false, polymorphic: false },
                ],
              },
            ];
          }
          return [];
        },
      } as any,
      invalidationCallback: undefined,
      tenantField: 'camp',
      tenantScopedCollections,
    });

    const args = makeCollectionAfterChangeArgs({ slug: 'posts' });
    (args.doc as any).camp = 'tenant-abc';
    (args.req as any).payload = { find: findMock } as any;

    await hook(args);

    // The events query should NOT include a tenant filter
    expect(findMock).toHaveBeenCalledWith({
      collection: 'events',
      where: { relatedPost: { in: ['1'] } },
    });

    // posts tag is tenant-scoped, events tag is collection-level
    expect(revalidateTag).toHaveBeenCalledWith('posts:tenant-abc');
    expect(revalidateTag).toHaveBeenCalledWith('events');
  });

  test('shared → tenant-scoped: falls back to collection-level invalidation', async () => {
    vi.mocked(revalidateTag).mockClear();

    const tenantScopedCollections = new Set(['posts' as CollectionSlug]);
    const findMock = vi.fn().mockResolvedValue({ docs: [{ id: '77' }] });

    const hook = invalidateCollectionCache({
      graph: {
        getDependants: (slug: string) => {
          if (slug === 'events') {
            return [
              {
                entity: { type: 'collection', slug: 'posts' },
                fields: [
                  { field: 'event', hasMany: false, polymorphic: false },
                ],
              },
            ];
          }
          return [];
        },
      } as any,
      invalidationCallback: undefined,
      tenantField: 'camp',
      tenantScopedCollections,
    });

    // 'events' is shared — no tenant on the doc
    const args = makeCollectionAfterChangeArgs({ slug: 'events' });
    (args.req as any).payload = { find: findMock } as any;

    await hook(args);

    // events is shared, no tenant → collection-level tag
    expect(revalidateTag).toHaveBeenCalledWith('events');
    // posts is tenant-scoped but tenantId is undefined (came from shared) → collection-level
    expect(revalidateTag).toHaveBeenCalledWith('posts');
    expect(revalidateTag).not.toHaveBeenCalledWith(
      expect.stringContaining('posts:'),
    );
  });
});
