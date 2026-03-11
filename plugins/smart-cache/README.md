# payload-smart-cache

Intelligent, dependency-aware cache invalidation for Next.js + Payload CMS applications.

[![npm version](https://img.shields.io/npm/v/payload-smart-cache)](https://www.npmjs.com/package/payload-smart-cache)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Overview

payload-smart-cache hooks into Payload's save and publish flow to provide automatic, dependency-aware cache invalidation. It builds a dependency graph from your collection and global relationships and walks it on every change, revalidating all affected Next.js cache tags — including indirectly related collections and globals.

**Features**

- **Dependency graph** — automatically discovers relationships between collections, so changing a referenced document revalidates its dependents.
- **Tag-based revalidation** — precise, granular cache invalidation via Next.js `revalidateTag()`.
- **Versions-aware** — for versioned collections, cache invalidation only fires on publish, not on draft saves.
- **Request caching utility** — `createRequestHandler` wraps data-fetching functions with collection/global-level cache tags for automatic revalidation.

## Installation

```sh
pnpm add payload-smart-cache
```

## Usage

**Important:** `smartCachePlugin` scans collection and global fields at config time to auto-discover referenced collections. It must be listed **after** any plugin that registers collections or injects relationship fields, so those are visible during the scan.

```ts
// payload.config.ts
import { buildConfig } from "payload";
import { discussionsPlugin } from "payload-discussions";
import { smartCachePlugin } from "payload-smart-cache";

export default buildConfig({
  // ...
  plugins: [
    discussionsPlugin({ collections: ["posts"] }), // registers collections & injects fields
    smartCachePlugin({
      collections: ["pages", "posts"],
      globals: ["site-settings"],
    }), // must come after
  ],
});
```

Wrap your data-fetching functions with `createRequestHandler` so they are cached by collection/global tags and automatically revalidated when those collections or globals change:

```ts
import { createRequestHandler } from "payload-smart-cache";

const getPosts = createRequestHandler(
  async () => {
    const payload = await getPayload({ config });
    return payload.find({ collection: "posts" });
  },
  ["posts"], // collection/global slugs — revalidated when posts change
);
```

You can pass additional cache options as a third argument:

```ts
const getPosts = createRequestHandler(
  async () => {
    const payload = await getPayload({ config });
    return payload.find({ collection: "posts" });
  },
  ["posts"],
  { revalidate: 60 }, // also revalidate every 60 seconds
);
```

| Cache Option  | Type               | Default | Description                                                          |
| ------------- | ------------------ | ------- | -------------------------------------------------------------------- |
| `tags`        | `string[]`         | `[]`    | Additional cache tags beyond the collection/global slugs.            |
| `revalidate`  | `number \| false`  | `false` | Time-based revalidation in seconds, or `false` for tag-based only.   |

### Options

| Option                | Type                                                                          | Default     | Description                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| `collections`         | `CollectionSlug[]`                                                            | `[]`        | Collections to track changes for. Referenced collections are auto-tracked.                                            |
| `globals`             | `GlobalSlug[]`                                                                | `[]`        | Globals to track changes for. Referenced collections are auto-tracked.                                                |
| `disableAutoTracking` | `boolean`                                                                     | `false`     | Disable automatic tracking of collections referenced via relationship/upload fields.                                  |
| `onInvalidate`        | `(change) => void \| Promise<void>` | —           | Called when cache invalidation fires for a registered collection (`{ type: 'collection', slug, docID }`) or global (`{ type: 'global', slug }`). |
| `tenantField`         | `string`                                                                      | `undefined` | Name of the tenant relationship field. When set, cache invalidation is scoped per-tenant. Collections without this field use global invalidation. |

### Multi-Tenant Support

For multi-tenant Payload applications using `@payloadcms/plugin-multi-tenant` (or a custom tenant field), set `tenantField` to scope cache invalidation per tenant. When a tenant's document changes, only that tenant's cached data is revalidated — other tenants' caches remain warm.

```ts
smartCachePlugin({
  collections: ["posts", "media", "members", "events"],
  tenantField: "tenant", // matches your multi-tenant plugin field name
})
```

Collections without the tenant field (e.g., shared content) are automatically detected and use global invalidation as before.

#### Tenant-scoped data fetching

**Next.js 15+ (unstable_cache)**

```ts
import { createTenantRequestHandler } from "payload-smart-cache";

const getPosts = createTenantRequestHandler(
  async (tenantId: string, slug: string) => {
    const payload = await getPayload({ config });
    return payload.find({
      collection: "posts",
      where: { slug: { equals: slug }, tenant: { equals: tenantId } },
    });
  },
  (tenantId) => ["posts", `posts:${tenantId}`],
);

// Usage
const posts = await getPosts(tenantId, "my-post");
```

**Next.js 16+ ("use cache" directive)**

```ts
import { tenantCacheTag } from "payload-smart-cache";

async function getPosts(tenantId: string) {
  "use cache";
  tenantCacheTag("posts", tenantId);

  const payload = await getPayload({ config });
  return payload.find({
    collection: "posts",
    where: { tenant: { equals: tenantId } },
  });
}
```

`tenantCacheTag` requires `cacheComponents: true` in your `next.config`.

## Contributing

This plugin lives in the [payload-plugins](https://github.com/davincicoding-org/payload-plugins) monorepo.

### Development

```sh
pnpm install

# watch this plugin for changes
pnpm --filter payload-smart-cache dev

# run the Payload dev app (in a second terminal)
pnpm --filter sandbox dev
```

The `sandbox/` directory is a Next.js + Payload app that imports plugins via `workspace:*` — use it to test changes locally.

### Code quality

- **Formatting & linting** — handled by [Biome](https://biomejs.dev/), enforced on commit via husky + lint-staged.
- **Commits** — must follow [Conventional Commits](https://www.conventionalcommits.org/) with a valid scope (e.g. `fix(payload-smart-cache): ...`).
- **Changesets** — please include a [changeset](https://github.com/changesets/changesets) in your PR by running `pnpm release`.

### Issues & PRs

Bug reports and feature requests are welcome — [open an issue](https://github.com/davincicoding-org/payload-plugins/issues).

## License

MIT
