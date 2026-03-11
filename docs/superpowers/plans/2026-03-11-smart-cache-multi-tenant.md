# Smart-Cache Multi-Tenant Support Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tenant-scoped cache invalidation to the smart-cache plugin so multi-tenant Payload apps only bust cache for the affected tenant.

**Architecture:** A new `tenantField` config option enables tenant-aware invalidation. At config time, the plugin auto-derives which collections are tenant-scoped (have the field) vs shared (don't). Hooks read the tenant from changed documents and emit scoped tags (`posts:tenant-abc`). Two new cache helpers are added for consumers.

**Tech Stack:** TypeScript, Payload CMS, Next.js (`unstable_cache`, `cacheTag`), Vitest

**Spec:** `docs/superpowers/specs/2026-03-11-smart-cache-multi-tenant-design.md`

**Branch:** `feat/smart-cache-multi-tenant`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/index.ts` | Modify | Add `tenantField` to config, derive `tenantScopedCollections` set, pass to hook factories |
| `src/types.ts` | Modify | Add `tenantId?: string` to `DocumentInvalidation` collection variant |
| `src/utils/resolve-tenant-id.ts` | Create | Utility to extract tenant ID from a doc (handles raw ID, populated object) |
| `src/utils/tenant-scoped-collections.ts` | Create | Utility to derive which collections have the tenant field |
| `src/hooks.ts` | Modify | Thread tenant config into `invalidateWithDependents`/`walkDependents`, emit scoped tags, scope queries |
| `src/exports/create-tenant-request.ts` | Create | `createTenantRequestHandler` — memoized per-tenant `unstable_cache` wrapper |
| `src/exports/cache.ts` | Create | `tenantCacheTag` helper for Next.js 16+ `"use cache"` |
| `package.json` | Modify | Add `"./cache"` subpath export |

---

## Chunk 1: Foundation — Types, Utilities, and Tenant Detection

### Task 1: Add `tenantId` to `DocumentInvalidation` type

**Files:**
- Modify: `plugins/smart-cache/src/types.ts`

- [ ] **Step 1: Write failing test**

Create `plugins/smart-cache/src/utils/resolve-tenant-id.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { resolveTenantId } from './resolve-tenant-id';

describe('resolveTenantId', () => {
  test('returns undefined when tenantField is not set', () => {
    expect(resolveTenantId({ id: '1', title: 'test' }, undefined)).toBeUndefined();
  });

  test('returns undefined when doc lacks tenant field', () => {
    expect(resolveTenantId({ id: '1', title: 'test' }, 'camp')).toBeUndefined();
  });

  test('extracts string tenant ID directly', () => {
    expect(resolveTenantId({ id: '1', camp: 'tenant-abc' }, 'camp')).toBe('tenant-abc');
  });

  test('extracts number tenant ID as string', () => {
    expect(resolveTenantId({ id: '1', camp: 42 }, 'camp')).toBe('42');
  });

  test('extracts tenant ID from populated relationship object', () => {
    expect(
      resolveTenantId({ id: '1', camp: { id: 'tenant-abc', name: 'Sparkle' } }, 'camp'),
    ).toBe('tenant-abc');
  });

  test('returns undefined for null tenant value', () => {
    expect(resolveTenantId({ id: '1', camp: null }, 'camp')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugins/smart-cache && pnpm test -- src/utils/resolve-tenant-id.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Update `DocumentInvalidation` type and create `resolveTenantId`**

In `plugins/smart-cache/src/types.ts`, update the collection variant of `DocumentInvalidation`:

```ts
/** Discriminated union passed to the `onInvalidate` callback. */
export type DocumentInvalidation<
  C extends CollectionSlug = CollectionSlug,
  G extends GlobalSlug = GlobalSlug,
> =
  | { type: 'collection'; slug: C; docID: DocumentID; tenantId?: string }
  | { type: 'global'; slug: G };
```

Create `plugins/smart-cache/src/utils/resolve-tenant-id.ts`:

```ts
/**
 * Extracts the tenant ID from a document.
 * Handles raw ID values (string/number) and populated relationship objects.
 * Returns `undefined` if `tenantField` is not set or the field is absent/null.
 */
export function resolveTenantId(
  doc: Record<string, unknown>,
  tenantField: string | undefined,
): string | undefined {
  if (!tenantField) return undefined;

  const value = doc[tenantField];
  if (value == null) return undefined;

  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'object' && 'id' in value) {
    return String((value as { id: unknown }).id);
  }

  return undefined;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd plugins/smart-cache && pnpm test -- src/utils/resolve-tenant-id.test.ts`
Expected: PASS — all 6 tests

- [ ] **Step 5: Commit**

```bash
git add plugins/smart-cache/src/types.ts plugins/smart-cache/src/utils/resolve-tenant-id.ts plugins/smart-cache/src/utils/resolve-tenant-id.test.ts
git commit -m "feat(smart-cache): add tenantId to DocumentInvalidation and resolveTenantId utility"
```

---

### Task 2: Create tenant-scoped collections detection utility

**Files:**
- Create: `plugins/smart-cache/src/utils/tenant-scoped-collections.ts`
- Create: `plugins/smart-cache/src/utils/tenant-scoped-collections.test.ts`

- [ ] **Step 1: Write failing test**

Create `plugins/smart-cache/src/utils/tenant-scoped-collections.test.ts`:

```ts
import type { CollectionConfig, CollectionSlug } from 'payload';
import { describe, expect, test } from 'vitest';
import { getTenantScopedCollections } from './tenant-scoped-collections';

function makeCollection(
  slug: string,
  fields: CollectionConfig['fields'] = [],
): CollectionConfig {
  return { slug, fields } as CollectionConfig;
}

describe('getTenantScopedCollections', () => {
  test('returns empty set when tenantField is undefined', () => {
    const result = getTenantScopedCollections(
      [makeCollection('posts', [{ name: 'camp', type: 'relationship', relationTo: 'tenants' }])],
      undefined,
    );
    expect(result.size).toBe(0);
  });

  test('detects collections with a matching top-level field', () => {
    const result = getTenantScopedCollections(
      [
        makeCollection('posts', [{ name: 'camp', type: 'relationship', relationTo: 'tenants' }]),
        makeCollection('events', [{ name: 'title', type: 'text' }]),
      ],
      'camp',
    );
    expect(result).toEqual(new Set(['posts']));
  });

  test('detects field nested in a tab', () => {
    const result = getTenantScopedCollections(
      [
        makeCollection('posts', [
          {
            type: 'tabs',
            tabs: [{ fields: [{ name: 'camp', type: 'relationship', relationTo: 'tenants' }] }],
          },
        ]),
      ],
      'camp',
    );
    expect(result).toEqual(new Set(['posts']));
  });

  test('does not match fields nested in named groups (field name differs)', () => {
    const result = getTenantScopedCollections(
      [
        makeCollection('posts', [
          {
            name: 'meta',
            type: 'group',
            fields: [{ name: 'camp', type: 'relationship', relationTo: 'tenants' }],
          },
        ]),
      ],
      'camp',
    );
    // The multi-tenant plugin adds tenant as a top-level field, so nested in a named
    // group means the field path is 'meta.camp', not 'camp'. This should not match.
    expect(result.size).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugins/smart-cache && pnpm test -- src/utils/tenant-scoped-collections.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `getTenantScopedCollections`**

Create `plugins/smart-cache/src/utils/tenant-scoped-collections.ts`:

```ts
import { findFields } from '@davincicoding/payload-plugin-kit';
import type { CollectionConfig, CollectionSlug, Field } from 'payload';

/**
 * Determines which collections have the tenant field by scanning their field configs.
 * Returns a Set of collection slugs that are tenant-scoped.
 *
 * Only matches top-level field names (or fields inside unnamed containers like
 * unnamed tabs/rows). Fields nested inside named groups/tabs don't match because
 * the multi-tenant plugin adds the tenant field at the top level.
 */
export function getTenantScopedCollections(
  collections: CollectionConfig[],
  tenantField: string | undefined,
): Set<CollectionSlug> {
  if (!tenantField) return new Set();

  const scoped = new Set<CollectionSlug>();

  for (const collection of collections) {
    const match = findFields(collection.fields, (f: Field) => {
      return 'name' in f && f.name === tenantField;
    });

    // Only consider fields whose path is exactly [tenantField] — i.e. top-level
    const hasTopLevelTenantField = match.some(
      (f) => f.path.length === 1 && f.path[0] === tenantField,
    );

    if (hasTopLevelTenantField) {
      scoped.add(collection.slug as CollectionSlug);
    }
  }

  return scoped;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd plugins/smart-cache && pnpm test -- src/utils/tenant-scoped-collections.test.ts`
Expected: PASS — all 4 tests

- [ ] **Step 5: Commit**

```bash
git add plugins/smart-cache/src/utils/tenant-scoped-collections.ts plugins/smart-cache/src/utils/tenant-scoped-collections.test.ts
git commit -m "feat(smart-cache): add getTenantScopedCollections detection utility"
```

---

## Chunk 2: Core — Tenant-Scoped Invalidation Hooks

### Task 3: Thread tenant config through hook factories and `invalidateWithDependents`

**Files:**
- Modify: `plugins/smart-cache/src/hooks.ts`
- Modify: `plugins/smart-cache/src/hooks.test.ts`
- Modify: `plugins/smart-cache/src/index.ts`

This is the largest task. The changes are:
1. Hook factories accept new params: `tenantField`, `tenantScopedCollections`
2. Hooks read `doc[tenantField]` via `resolveTenantId()`
3. `invalidateWithDependents` and `walkDependents` produce scoped tags and scoped queries
4. `index.ts` derives the scoped set and passes it to hook factories

- [ ] **Step 1: Write failing tests for tenant-scoped invalidation**

Add these tests to `plugins/smart-cache/src/hooks.test.ts` (append to existing file):

```ts
// Add to imports at top:
// import { resolveTenantId } from './utils/resolve-tenant-id'; (not needed in test, but ensure mocks work)

describe('tenant-scoped invalidation', () => {
  const tenantScopedCollections = new Set(['posts' as CollectionSlug]);

  function makeTenantCollectionHookConfig(
    overrides: { invalidationCallback?: DocumentInvalidationCallback } = {},
  ) {
    return {
      graph: { getDependants: () => [] } as any,
      invalidationCallback: overrides.invalidationCallback,
      tenantField: 'camp',
      tenantScopedCollections,
    };
  }

  test('emits tenant-scoped tag when tenant field is present', async () => {
    vi.mocked(revalidateTag).mockClear();

    const hook = invalidateCollectionCache(makeTenantCollectionHookConfig());

    await hook(
      makeCollectionAfterChangeArgs({
        slug: 'posts',
      }),
    );

    // The doc in makeCollectionAfterChangeArgs has no camp field,
    // so it should fall back to collection-level tag
    expect(revalidateTag).toHaveBeenCalledWith('posts');
  });

  test('emits tenant-scoped tag when doc has tenant value', async () => {
    vi.mocked(revalidateTag).mockClear();

    const hook = invalidateCollectionCache(makeTenantCollectionHookConfig());

    const args = makeCollectionAfterChangeArgs({ slug: 'posts' });
    // Manually add tenant field to the doc
    (args.doc as any).camp = 'tenant-abc';

    await hook(args);

    expect(revalidateTag).toHaveBeenCalledWith('posts:tenant-abc');
    expect(revalidateTag).not.toHaveBeenCalledWith('posts');
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
      makeTenantCollectionHookConfig({ invalidationCallback }),
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd plugins/smart-cache && pnpm test -- src/hooks.test.ts`
Expected: FAIL — hook factories don't accept tenant params yet

- [ ] **Step 3: Update hook factories and `invalidateWithDependents`**

Replace the full content of `plugins/smart-cache/src/hooks.ts`:

```ts
import { revalidateTag } from 'next/cache';
import type {
  BasePayload,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionSlug,
  GlobalAfterChangeHook,
} from 'payload';
import type { DocumentInvalidationCallback, DocumentWithStatus } from './types';
import type { EntitiesGraph } from './utils/dependency-graph';
import { resolveTenantId } from './utils/resolve-tenant-id';

interface TenantConfig {
  tenantField?: string;
  tenantScopedCollections: Set<CollectionSlug>;
}

function buildTag(
  slug: string,
  tenantId: string | undefined,
  tenantScopedCollections: Set<CollectionSlug>,
): string {
  if (tenantId && tenantScopedCollections.has(slug as CollectionSlug)) {
    return `${slug}:${tenantId}`;
  }
  return slug;
}

async function invalidateWithDependents(
  payload: BasePayload,
  {
    graph,
    invalidationCallback,
    collection,
    ids,
    tenantId,
    tenantConfig,
  }: {
    graph: EntitiesGraph;
    invalidationCallback: DocumentInvalidationCallback | undefined;
    collection: CollectionSlug;
    ids: string[];
    tenantId: string | undefined;
    tenantConfig: TenantConfig;
  },
): Promise<void> {
  const tagsToInvalidate = new Set<string>();

  tagsToInvalidate.add(
    buildTag(collection, tenantId, tenantConfig.tenantScopedCollections),
  );

  await walkDependents(graph, payload, collection, ids, new Set(), tenantId, tenantConfig);

  for (const tag of tagsToInvalidate) {
    revalidateTag(tag);
  }

  for (const id of ids) {
    await invalidationCallback?.({
      type: 'collection',
      slug: collection,
      docID: id,
      tenantId,
    });
  }

  async function walkDependents(
    graph: EntitiesGraph,
    payload: BasePayload,
    changedCollection: CollectionSlug,
    changedIds: string[],
    visited: Set<string>,
    tenantId: string | undefined,
    tenantConfig: TenantConfig,
  ): Promise<void> {
    const dependents = graph.getDependants(changedCollection);

    if (dependents.length === 0) return;

    for (const dependent of dependents) {
      if (dependent.entity.type === 'global') {
        tagsToInvalidate.add(dependent.entity.slug);
        continue;
      }

      if (visited.has(dependent.entity.slug)) continue;

      const depIsTenantScoped = tenantConfig.tenantScopedCollections.has(
        dependent.entity.slug as CollectionSlug,
      );
      const effectiveTenantId = depIsTenantScoped ? tenantId : undefined;

      const allAffectedItems = new Map<string, { id: string | number }>();

      for (const field of dependent.fields) {
        const baseWhere = field.polymorphic
          ? {
              and: [
                {
                  [`${field.field}.relationTo`]: {
                    equals: changedCollection,
                  },
                },
                { [`${field.field}.value`]: { in: changedIds } },
              ],
            }
          : {
              [field.field]: {
                in: changedIds,
              },
            };

        // Add tenant filter for tenant-scoped dependents
        const where =
          effectiveTenantId && tenantConfig.tenantField
            ? {
                and: [
                  baseWhere,
                  { [tenantConfig.tenantField]: { equals: effectiveTenantId } },
                ],
              }
            : baseWhere;

        const { docs } = await payload.find({
          collection: dependent.entity.slug,
          where,
        });

        for (const item of docs) {
          allAffectedItems.set(item.id.toString(), item);
        }
      }

      const affectedItems = Array.from(allAffectedItems.values());

      visited.add(dependent.entity.slug);

      if (affectedItems.length === 0) continue;

      tagsToInvalidate.add(
        buildTag(dependent.entity.slug, effectiveTenantId, tenantConfig.tenantScopedCollections),
      );

      for (const item of affectedItems) {
        await invalidationCallback?.({
          type: 'collection',
          slug: dependent.entity.slug,
          docID: item.id.toString(),
          tenantId: effectiveTenantId,
        });
      }

      await walkDependents(
        graph,
        payload,
        dependent.entity.slug,
        affectedItems.map((item) => item.id.toString()),
        visited,
        effectiveTenantId,
        tenantConfig,
      );
    }
  }
}

interface CollectionHookConfig {
  graph: EntitiesGraph;
  invalidationCallback: DocumentInvalidationCallback | undefined;
  tenantField?: string;
  tenantScopedCollections?: Set<CollectionSlug>;
}

export function invalidateCollectionCache({
  graph,
  invalidationCallback,
  tenantField,
  tenantScopedCollections = new Set(),
}: CollectionHookConfig): CollectionAfterChangeHook<DocumentWithStatus> {
  const tenantConfig: TenantConfig = { tenantField, tenantScopedCollections };

  return async ({ req, doc, collection, previousDoc }) => {
    if (req.context.skipRevalidation) return;

    if (collection.versions?.drafts) {
      if (doc._status === 'draft' && previousDoc._status !== 'published')
        return;
    }

    const tenantId = resolveTenantId(doc as Record<string, unknown>, tenantField);

    await invalidateWithDependents(req.payload, {
      graph,
      invalidationCallback,
      collection: collection.slug,
      ids: [doc.id.toString()],
      tenantId,
      tenantConfig,
    });
  };
}

export function invalidateCollectionCacheOnDelete({
  graph,
  invalidationCallback,
  tenantField,
  tenantScopedCollections = new Set(),
}: CollectionHookConfig & {
  invalidationCallback: DocumentInvalidationCallback;
}): CollectionAfterDeleteHook<DocumentWithStatus> {
  const tenantConfig: TenantConfig = { tenantField, tenantScopedCollections };

  return async ({ req, doc, collection }) => {
    if (req.context.skipRevalidation) return;

    const tenantId = resolveTenantId(doc as Record<string, unknown>, tenantField);

    await invalidateWithDependents(req.payload, {
      graph,
      invalidationCallback,
      collection: collection.slug,
      ids: [doc.id.toString()],
      tenantId,
      tenantConfig,
    });
  };
}

export function invalidateGlobalCache(
  invalidationCallback: DocumentInvalidationCallback,
): GlobalAfterChangeHook {
  return async ({ req, global, doc, previousDoc }) => {
    if (global.versions?.drafts) {
      if (doc._status === 'draft' && previousDoc._status !== 'published')
        return;
    }
    if (req.context.skipRevalidation) return;

    revalidateTag(global.slug);
    await invalidationCallback?.({ type: 'global', slug: global.slug });
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd plugins/smart-cache && pnpm test -- src/hooks.test.ts`
Expected: PASS — all existing tests + new tenant-scoped tests pass. Existing tests pass because `tenantField`/`tenantScopedCollections` default to `undefined`/empty set.

- [ ] **Step 5: Commit**

```bash
git add plugins/smart-cache/src/hooks.ts plugins/smart-cache/src/hooks.test.ts
git commit -m "feat(smart-cache): tenant-scoped invalidation in hooks"
```

---

### Task 4: Wire tenant config into plugin entry point

**Files:**
- Modify: `plugins/smart-cache/src/index.ts`

- [ ] **Step 1: Update `SmartCachePluginConfig` and plugin factory**

In `plugins/smart-cache/src/index.ts`, add the `tenantField` option to the config interface and derive the scoped set at config time:

Add to `SmartCachePluginConfig`:
```ts
  /**
   * Name of the tenant relationship field on your collections.
   * When set, cache invalidation is scoped per-tenant.
   * Collections without this field are treated as shared and use global invalidation.
   * Must match the field name used by `@payloadcms/plugin-multi-tenant` or your custom tenant field.
   */
  tenantField?: string;
```

In the plugin factory function, after the `graph` creation and before the globals loop, add:
```ts
    const tenantScopedCollections = getTenantScopedCollections(
      config.collections ?? [],
      tenantField,
    );
```

Update the hook factory calls to pass the new params:
```ts
invalidateCollectionCache({ graph, invalidationCallback, tenantField, tenantScopedCollections })
```
```ts
invalidateCollectionCacheOnDelete({ graph, invalidationCallback, tenantField, tenantScopedCollections })
```

Add the import:
```ts
import { getTenantScopedCollections } from './utils/tenant-scoped-collections';
```

Add `tenantField` to the destructured config:
```ts
  ({
    collections = [],
    globals = [],
    onInvalidate,
    disableAutoTracking,
    tenantField,
  }: SmartCachePluginConfig<C, G>): Plugin =>
```

- [ ] **Step 2: Run all tests**

Run: `cd plugins/smart-cache && pnpm test`
Expected: PASS — all tests (hooks, dependency-graph, tracked-collections, resolve-tenant-id, tenant-scoped-collections)

- [ ] **Step 3: Run type check**

Run: `cd plugins/smart-cache && pnpm check:types`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add plugins/smart-cache/src/index.ts
git commit -m "feat(smart-cache): wire tenantField config into plugin entry point"
```

---

## Chunk 3: Cache Helpers and Exports

### Task 5: Create `createTenantRequestHandler`

**Files:**
- Create: `plugins/smart-cache/src/exports/create-tenant-request.ts`
- Create: `plugins/smart-cache/src/exports/create-tenant-request.test.ts`
- Modify: `plugins/smart-cache/src/index.ts` (re-export)

- [ ] **Step 1: Write failing test**

Create `plugins/smart-cache/src/exports/create-tenant-request.test.ts`:

```ts
import { describe, expect, test, vi } from 'vitest';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn, _keyParts, _options) => fn),
}));

import { unstable_cache } from 'next/cache';
import { createTenantRequestHandler } from './create-tenant-request';

describe('createTenantRequestHandler', () => {
  test('calls handler with all arguments', async () => {
    const handler = vi.fn(async (tenantId: string, slug: string) => ({ tenantId, slug }));
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

    const cached = createTenantRequestHandler(handler, tagsFn, { revalidate: 3600 });
    await cached('tenant-abc');

    expect(unstable_cache).toHaveBeenCalledWith(handler, ['tenant-abc'], {
      tags: ['posts'],
      revalidate: 3600,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugins/smart-cache && pnpm test -- src/exports/create-tenant-request.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `createTenantRequestHandler`**

Create `plugins/smart-cache/src/exports/create-tenant-request.ts`:

```ts
import { unstable_cache } from 'next/cache';

export interface TenantRequestHandlerOptions {
  /** Time-based revalidation in seconds, or `false` to rely solely on tag-based revalidation. */
  revalidate?: number | false;
}

/**
 * Wraps a data-fetching function with tenant-scoped Next.js `unstable_cache`.
 * The first argument to the handler is always the tenant ID, used to:
 * - Generate tenant-scoped cache tags via `tagsFn`
 * - Create a separate `unstable_cache` wrapper per tenant (memoized)
 *
 * @param handler - The async function to cache. First arg must be the tenant ID.
 * @param tagsFn - Function that receives the tenant ID and returns cache tags.
 * @param options - Additional cache options.
 */
export const createTenantRequestHandler = <Data, Inputs extends [string, ...unknown[]]>(
  handler: (...inputs: Inputs) => Promise<Data>,
  tagsFn: (tenantId: string) => string[],
  options?: TenantRequestHandlerOptions,
): ((...inputs: Inputs) => Promise<Data>) => {
  const cache = new Map<string, (...inputs: Inputs) => Promise<Data>>();

  return (...inputs: Inputs): Promise<Data> => {
    const tenantId = inputs[0];

    if (!cache.has(tenantId)) {
      cache.set(
        tenantId,
        unstable_cache(handler, [tenantId], {
          tags: tagsFn(tenantId),
          revalidate: options?.revalidate ?? false,
        }),
      );
    }

    return cache.get(tenantId)!(...inputs);
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd plugins/smart-cache && pnpm test -- src/exports/create-tenant-request.test.ts`
Expected: PASS — all 5 tests

- [ ] **Step 5: Re-export from `index.ts`**

Add to the exports section of `plugins/smart-cache/src/index.ts`:

```ts
export {
  createTenantRequestHandler,
  type TenantRequestHandlerOptions,
} from './exports/create-tenant-request';
```

- [ ] **Step 6: Run type check**

Run: `cd plugins/smart-cache && pnpm check:types`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add plugins/smart-cache/src/exports/create-tenant-request.ts plugins/smart-cache/src/exports/create-tenant-request.test.ts plugins/smart-cache/src/index.ts
git commit -m "feat(smart-cache): add createTenantRequestHandler for tenant-scoped caching"
```

---

### Task 6: Create `tenantCacheTag` helper and `./cache` subpath export

**Files:**
- Create: `plugins/smart-cache/src/exports/cache.ts`
- Create: `plugins/smart-cache/src/exports/cache.test.ts`
- Modify: `plugins/smart-cache/package.json`

- [ ] **Step 1: Write failing test**

Create `plugins/smart-cache/src/exports/cache.test.ts`:

```ts
import { describe, expect, test, vi } from 'vitest';

vi.mock('next/cache', () => ({
  cacheTag: vi.fn(),
}));

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugins/smart-cache && pnpm test -- src/exports/cache.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `tenantCacheTag`**

Create `plugins/smart-cache/src/exports/cache.ts`:

```ts
import { cacheTag } from 'next/cache';

/**
 * Applies tenant-scoped cache tags for use with Next.js 16+ `"use cache"` directive.
 * For each slug, registers both the base tag and a tenant-scoped tag (`slug:tenantId`).
 *
 * @param slugs - Collection/global slug(s) to tag.
 * @param tenantId - The tenant ID to scope the cache tags to.
 */
export function tenantCacheTag(
  slugs: string | string[],
  tenantId: string,
): void {
  const slugArray = Array.isArray(slugs) ? slugs : [slugs];
  const tags = slugArray.flatMap((slug) => [slug, `${slug}:${tenantId}`]);
  cacheTag(...tags);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd plugins/smart-cache && pnpm test -- src/exports/cache.test.ts`
Expected: PASS — both tests

- [ ] **Step 5: Add `./cache` subpath export to `package.json`**

In `plugins/smart-cache/package.json`, update the `"exports"` field:

```json
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    },
    "./cache": {
      "types": "./dist/exports/cache.d.ts",
      "import": "./dist/exports/cache.js",
      "default": "./dist/exports/cache.js"
    }
  },
```

- [ ] **Step 6: Run type check**

Run: `cd plugins/smart-cache && pnpm check:types`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add plugins/smart-cache/src/exports/cache.ts plugins/smart-cache/src/exports/cache.test.ts plugins/smart-cache/package.json
git commit -m "feat(smart-cache): add tenantCacheTag helper and ./cache subpath export"
```

---

## Chunk 4: Verification

### Task 7: Full test suite and build verification

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `cd plugins/smart-cache && pnpm test`
Expected: PASS — all tests across all files

- [ ] **Step 2: Run linter**

Run: `cd plugins/smart-cache && pnpm lint`
Expected: No errors (run `pnpm lint:fix` if formatting issues)

- [ ] **Step 3: Run build**

Run: `cd plugins/smart-cache && pnpm build`
Expected: Build succeeds, `dist/` contains all new files including `exports/cache.js`, `exports/create-tenant-request.js`, `utils/resolve-tenant-id.js`, `utils/tenant-scoped-collections.js`

- [ ] **Step 4: Verify exports resolve**

Run: `node -e "const pkg = require('./plugins/smart-cache/package.json'); console.log(JSON.stringify(pkg.exports, null, 2))"`
Expected: Shows both `"."` and `"./cache"` entries

- [ ] **Step 5: Final commit if any lint fixes were needed**

```bash
git add -A plugins/smart-cache/
git commit -m "chore(smart-cache): lint fixes"
```
