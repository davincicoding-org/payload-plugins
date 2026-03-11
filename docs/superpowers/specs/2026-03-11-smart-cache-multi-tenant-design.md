# Smart-Cache Multi-Tenant Support

## Problem

The smart-cache plugin invalidates cache at the collection level (e.g., `revalidateTag('posts')`). In a multi-tenant setup with 50+ tenants writing daily, a single tenant's change busts the cache for all tenants — resulting in near-zero effective cache lifetime.

## Solution

Add a `tenantField` option to `smartCachePlugin`. When set, the plugin scopes cache tags and invalidation by tenant (e.g., `revalidateTag('posts:tenant-abc')`). Collections without the tenant field are automatically detected and use global invalidation.

## Plugin Config

```ts
smartCachePlugin({
  collections: ['posts', 'media', 'members', 'events'],
  globals: ['settings'],
  tenantField: 'camp',
})
```

- `tenantField` — the name of the tenant relationship field added by `@payloadcms/plugin-multi-tenant` (or a custom field). Optional; omitting preserves current behavior.
- Tenant-scoped vs shared collections are **derived automatically** at config time by checking whether each collection has a field matching `tenantField`. This relies on smart-cache running after the multi-tenant plugin in the config (already a documented requirement).

## Invalidation Behavior

### Tenant-scoped collections (have `tenantField`)

1. `afterChange`/`afterDelete` hook reads `doc[tenantField]` from the changed document.
2. Resolves tenant ID (handles both raw ID and populated relationship object).
3. Calls `revalidateTag('posts:tenant-abc')` instead of `revalidateTag('posts')`.
4. Dependency graph walk adds `{ [tenantField]: { equals: tenantId } }` to where clauses when querying dependents.

### Shared collections (no `tenantField`)

1. Falls back to current behavior: `revalidateTag('events')`.
2. Dependency graph walk uses no tenant filter.

### Cross-boundary dependencies

- **Tenant-scoped → shared:** Walk into shared collection drops tenant filter.
- **Shared → tenant-scoped:** Walk into tenant-scoped collection cannot scope by tenant (no tenant on the triggering doc), falls back to collection-level invalidation for that collection.
- **Visited guard interaction:** The `visited` set in `walkDependents` prevents re-visiting a collection. If a tenant-scoped collection is reachable via both a scoped path (direct) and an unscoped path (via shared intermediary), the first visit wins. Since tenant-scoped invalidation is strictly narrower than collection-level, the worst case is slightly over-invalidating — which is safe. No changes to `visited` semantics needed.

## Edge Cases

- **Document without tenant value:** Falls back to collection-level invalidation. Handles migration gracefully.
- **Tenant field as relationship (ID vs object):** Extract ID if populated as object, use raw value if string/number.
- **`req.context.skipRevalidation`:** Respected as before.
- **Versioned collections with drafts:** Draft-skip logic unchanged; tenant scoping applies only when invalidation fires.
- **`onInvalidate` callback:** `DocumentInvalidation` gains an optional `tenantId?: string` field (always a resolved ID string, never a populated relationship object). Non-breaking for existing consumers.

## Cache Helpers

### Tier 1: `createRequestHandler` (Next.js 15+, unchanged)

Stays on `unstable_cache`. No tenant awareness. Existing API preserved.

### Tier 1b: `createTenantRequestHandler` (Next.js 15+, new export)

```ts
import { createTenantRequestHandler } from 'payload-smart-cache'

const getPosts = createTenantRequestHandler(
  (tenantId: string, slug: string) =>
    payload.find({
      collection: 'posts',
      where: { slug: { equals: slug }, camp: { equals: tenantId } },
    }),
  (tenantId: string) => ['posts', `posts:${tenantId}`],
)

const posts = await getPosts(campId, 'my-post')
```

Internally memoizes one `unstable_cache` wrapper per unique tenant (first argument). Tags are resolved by calling the tags factory with the tenant ID. The memoization map grows to at most one entry per tenant — with 50-100 tenants this is negligible. For deployments with thousands of tenants, the map is bounded by the number of unique tenants that make requests to a given server instance (not total tenants), and entries are naturally cleared on deployment.

### Tier 2: `tenantCacheTag` (Next.js 16+, new export)

```ts
import { tenantCacheTag } from 'payload-smart-cache/cache'

async function getPosts(tenantId: string, slug: string) {
  'use cache'
  tenantCacheTag('posts', tenantId)

  return payload.find({
    collection: 'posts',
    where: { slug: { equals: slug }, camp: { equals: tenantId } },
  })
}
```

Calls `cacheTag(slug, \`${slug}:${tenantId}\`)`. Requires `cacheComponents: true` in `next.config`.

## Data Flow

```
Tenant-scoped change (camp-sparkle-ponies updates a post)
  │
  ├─ afterChange hook fires
  ├─ Read doc.camp → "camp-sparkle-ponies"
  ├─ Collection has tenantField? → Yes
  ├─ revalidateTag('posts:camp-sparkle-ponies')
  │
  └─ walkDependents (tenant-scoped)
     ├─ Query: media WHERE id IN [ref-ids] AND camp = "camp-sparkle-ponies"
     ├─ revalidateTag('media:camp-sparkle-ponies')
     └─ ... recurse

Shared collection change (shared event updated)
  │
  ├─ afterChange hook fires
  ├─ Collection has tenantField? → No
  ├─ revalidateTag('events')
  └─ walkDependents (no tenant filter)
```

## Implementation Scope

### Modified files

- `src/index.ts` — add `tenantField` to `SmartCachePluginConfig` (the interface lives here, not in `types.ts`), derive tenant-scoped collections set at config time, pass `tenantField` and scoped set to hook factories
- `src/types.ts` — add optional `tenantId?: string` (resolved ID string) to `DocumentInvalidation`
- `src/hooks.ts` — thread `tenantField`, `tenantScopedCollections` set, and resolved `tenantId` into `invalidateWithDependents` and `walkDependents`. Key changes: (a) tag emission in both the outer function and `walkDependents` must produce scoped tags (`slug:tenantId`) for tenant-scoped collections, (b) `walkDependents` where clauses add tenant filter for tenant-scoped dependents, (c) `tenantId` passed as new parameter to `walkDependents`
- `src/exports/create-request.ts` — no changes
- `package.json` — add `"./cache"` subpath export pointing to `src/exports/cache.ts`

### New files

- `src/exports/create-tenant-request.ts` — `createTenantRequestHandler` (memoized per-tenant `unstable_cache`)
- `src/exports/cache.ts` — `tenantCacheTag` helper for Next.js 16+ `"use cache"` users

### Tests

- Unit tests for tenant-scoped invalidation (scoped tag, scoped dependency walk)
- Unit tests for shared collection fallback
- Unit tests for cross-boundary dependency walks
- Unit tests for `createTenantRequestHandler` memoization
- Integration test validating hooks with multi-tenant plugin

## Backwards Compatibility

- `tenantField` is optional — omitting preserves current behavior exactly
- `createRequestHandler` signature unchanged
- New exports are additive
- No breaking changes to existing API
