import type {
  BasePayload,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionSlug,
  GlobalAfterChangeHook,
  GlobalSlug,
  TypeWithID,
} from 'payload';
import { describe, expect, test, vi } from 'vitest';

import { createHooks } from '@/hooks';

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/utils/dependency-graph', () => ({
  createDependencyGraph: vi.fn(() => ({
    getDependants: vi.fn(() => []),
  })),
}));

import { revalidateTag } from 'next/cache';
import { createDependencyGraph } from '@/utils/dependency-graph';

type AfterChangeArgs = Parameters<CollectionAfterChangeHook<TypeWithID>>[0];
type AfterDeleteArgs = Parameters<CollectionAfterDeleteHook<TypeWithID>>[0];
type GlobalAfterChangeArgs = Parameters<GlobalAfterChangeHook>[0];

function makePayload(): BasePayload {
  return {} as BasePayload;
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

describe('createHooks', () => {
  describe('collectionAfterChange', () => {
    test('revalidates tag for non-draft collection on every save', async () => {
      vi.mocked(revalidateTag).mockClear();

      const { collectionAfterChange } = createHooks({
        collections: ['posts' as CollectionSlug],
        globals: [],
      });

      await collectionAfterChange(makeCollectionAfterChangeArgs({}));

      expect(revalidateTag).toHaveBeenCalledWith('posts');
    });

    test('does NOT revalidate when draft save and not publishing', async () => {
      vi.mocked(revalidateTag).mockClear();

      const { collectionAfterChange } = createHooks({
        collections: ['posts' as CollectionSlug],
        globals: [],
      });

      await collectionAfterChange(
        makeCollectionAfterChangeArgs({
          drafts: true,
          _status: 'draft',
        }),
      );

      expect(revalidateTag).not.toHaveBeenCalled();
    });

    test('revalidates when publishing a draft', async () => {
      vi.mocked(revalidateTag).mockClear();

      const { collectionAfterChange } = createHooks({
        collections: ['posts' as CollectionSlug],
        globals: [],
      });

      await collectionAfterChange(
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

      const { collectionAfterChange } = createHooks({
        collections: ['posts' as CollectionSlug],
        globals: [],
      });

      await collectionAfterChange(
        makeCollectionAfterChangeArgs({
          drafts: true,
          _status: 'published',
          previousStatus: 'published',
        }),
      );

      // The hook only checks doc._status === 'published', not previousDoc,
      // so re-saving a published doc still triggers revalidation.
      expect(revalidateTag).toHaveBeenCalledWith('posts');
    });
  });

  describe('collectionAfterDelete', () => {
    test('always revalidates tag on delete', async () => {
      vi.mocked(revalidateTag).mockClear();

      const { collectionAfterDelete } = createHooks({
        collections: ['posts' as CollectionSlug],
        globals: [],
      });

      await collectionAfterDelete(makeCollectionAfterDeleteArgs());

      expect(revalidateTag).toHaveBeenCalledWith('posts');
    });
  });

  describe('globalAfterChange', () => {
    test('revalidates tag with global slug and fires onInvalidate', async () => {
      vi.mocked(revalidateTag).mockClear();
      const onInvalidate = vi.fn();

      const { globalAfterChange } = createHooks({
        collections: [],
        globals: ['nav' as GlobalSlug],
        onInvalidate,
      });

      await globalAfterChange(makeGlobalAfterChangeArgs());

      expect(revalidateTag).toHaveBeenCalledWith('nav');
      expect(onInvalidate).toHaveBeenCalledWith({
        collection: 'nav',
        docID: 'nav',
      });
    });
  });

  describe('onInvalidate filtering', () => {
    test('does NOT fire onInvalidate for non-registered collections', async () => {
      vi.mocked(revalidateTag).mockClear();
      const onInvalidate = vi.fn();

      // Register 'posts' but not 'media'
      const { collectionAfterChange } = createHooks({
        collections: ['posts' as CollectionSlug],
        globals: [],
        onInvalidate,
      });

      // Trigger a change on 'media' which is auto-tracked but not registered
      await collectionAfterChange(
        makeCollectionAfterChangeArgs({ slug: 'media' }),
      );

      // revalidateTag still fires (cache invalidation happens regardless)
      expect(revalidateTag).toHaveBeenCalledWith('media');
      // but onInvalidate should NOT fire for non-registered collections
      expect(onInvalidate).not.toHaveBeenCalled();
    });

    test('fires onInvalidate for registered collections', async () => {
      vi.mocked(revalidateTag).mockClear();
      const onInvalidate = vi.fn();

      const { collectionAfterChange } = createHooks({
        collections: ['posts' as CollectionSlug],
        globals: [],
        onInvalidate,
      });

      await collectionAfterChange(
        makeCollectionAfterChangeArgs({ slug: 'posts' }),
      );

      expect(onInvalidate).toHaveBeenCalledWith({
        collection: 'posts',
        docID: '1',
      });
    });
  });
});
