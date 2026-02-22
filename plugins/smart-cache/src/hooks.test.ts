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
} from '@/hooks';
import type { DocumentWithStatus, InvalidationConfig } from '@/types';

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

function makeConfig(
  overrides: {
    collections?: string[];
    globals?: string[];
    onInvalidate?: InvalidationConfig['onInvalidate'];
  } = {},
): InvalidationConfig {
  const registeredCollections = new Set(
    (overrides.collections ?? []) as CollectionSlug[],
  );
  const registeredGlobals = new Set((overrides.globals ?? []) as GlobalSlug[]);
  return {
    resolve: () => ({
      graph: { getDependants: () => [] } as any,
      registeredCollections,
      registeredGlobals,
    }),
    onInvalidate: overrides.onInvalidate,
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
    req: { payload: makePayload() },
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
    req: { payload: makePayload() },
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
    req: { payload: makePayload() },
    context: {},
  } as unknown as GlobalAfterChangeArgs;
}

describe('invalidateCollectionCache', () => {
  test('revalidates tag for non-draft collection on every save', async () => {
    vi.mocked(revalidateTag).mockClear();

    const hook = invalidateCollectionCache(
      makeConfig({ collections: ['posts'] }),
    );

    await hook(makeCollectionAfterChangeArgs({}));

    expect(revalidateTag).toHaveBeenCalledWith('posts');
  });

  test('does NOT revalidate when draft save and not publishing', async () => {
    vi.mocked(revalidateTag).mockClear();

    const hook = invalidateCollectionCache(
      makeConfig({ collections: ['posts'] }),
    );

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

    const hook = invalidateCollectionCache(
      makeConfig({ collections: ['posts'] }),
    );

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

    const hook = invalidateCollectionCache(
      makeConfig({ collections: ['posts'] }),
    );

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

    const hook = invalidateCollectionCacheOnDelete(
      makeConfig({ collections: ['posts'] }),
    );

    await hook(makeCollectionAfterDeleteArgs());

    expect(revalidateTag).toHaveBeenCalledWith('posts');
  });
});

describe('invalidateGlobalCache', () => {
  test('revalidates tag with global slug and fires onInvalidate', async () => {
    vi.mocked(revalidateTag).mockClear();
    const onInvalidate = vi.fn();

    const hook = invalidateGlobalCache(
      makeConfig({ globals: ['nav'], onInvalidate }),
    );

    await hook(makeGlobalAfterChangeArgs());

    expect(revalidateTag).toHaveBeenCalledWith('nav');
    expect(onInvalidate).toHaveBeenCalledWith({
      type: 'global',
      slug: 'nav',
    });
  });

  test('does NOT revalidate or fire onInvalidate for unregistered globals', async () => {
    vi.mocked(revalidateTag).mockClear();
    const onInvalidate = vi.fn();

    const hook = invalidateGlobalCache(
      makeConfig({ globals: ['nav'], onInvalidate }),
    );

    await hook(makeGlobalAfterChangeArgs({ slug: 'footer' }));

    expect(revalidateTag).not.toHaveBeenCalled();
    expect(onInvalidate).not.toHaveBeenCalled();
  });
});

describe('onInvalidate filtering', () => {
  test('does NOT fire onInvalidate for non-registered collections', async () => {
    vi.mocked(revalidateTag).mockClear();
    const onInvalidate = vi.fn();

    const hook = invalidateCollectionCache(
      makeConfig({ collections: ['posts'], onInvalidate }),
    );

    await hook(makeCollectionAfterChangeArgs({ slug: 'media' }));

    expect(revalidateTag).toHaveBeenCalledWith('media');
    expect(onInvalidate).not.toHaveBeenCalled();
  });

  test('fires onInvalidate for registered collections', async () => {
    vi.mocked(revalidateTag).mockClear();
    const onInvalidate = vi.fn();

    const hook = invalidateCollectionCache(
      makeConfig({ collections: ['posts'], onInvalidate }),
    );

    await hook(makeCollectionAfterChangeArgs({ slug: 'posts' }));

    expect(onInvalidate).toHaveBeenCalledWith({
      type: 'collection',
      slug: 'posts',
      docID: '1',
    });
  });
});
