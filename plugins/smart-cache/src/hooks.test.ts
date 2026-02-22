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
    });
  });
});
