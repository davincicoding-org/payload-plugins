# payload-smart-cache

Intelligent, dependency-aware cache invalidation for Next.js + Payload CMS applications.

[![npm version](https://img.shields.io/npm/v/payload-smart-cache)](https://www.npmjs.com/package/payload-smart-cache)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Overview

payload-smart-cache tracks document changes in a publish queue and builds a dependency graph from your collection relationships. When you publish, it walks the graph and revalidates all affected Next.js cache tags — including indirectly related documents. A publish button in the admin UI shows when unpublished changes exist.

**Features**

- **Deferred publishing** — changes are queued and only pushed to the cache when you explicitly publish.
- **Dependency graph** — automatically discovers relationships between collections, so changing a referenced document revalidates its dependents.
- **Tag-based revalidation** — precise, granular cache invalidation via Next.js `revalidateTag()`.
- **Request caching utility** — `createRequestHandler` wraps data-fetching functions with entity-level cache tags for automatic revalidation.

## Installation

```sh
pnpm add payload-smart-cache
```

## Usage

```ts
// payload.config.ts
import { buildConfig } from 'payload';
import { smartCachePlugin } from 'payload-smart-cache';

export default buildConfig({
  // ...
  plugins: [
    smartCachePlugin({
      collections: ['pages', 'posts'],
      globals: ['site-settings'],
    }),
  ],
});
```

Wrap your data-fetching functions with `createRequestHandler` so they are cached by entity tags and automatically revalidated on publish:

```ts
import { createRequestHandler } from 'payload-smart-cache';

const getPosts = createRequestHandler(
  async () => {
    const payload = await getPayload({ config });
    return payload.find({ collection: 'posts' });
  },
  ['posts'], // cache tags — revalidated when posts change
);
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `collections` | `CollectionSlug[]` | `[]` | Collections to track changes for. Referenced collections are auto-tracked. |
| `globals` | `GlobalSlug[]` | `[]` | Globals to track changes for. Referenced collections are auto-tracked. |
| `disableAutoTracking` | `boolean` | `false` | Disable automatic tracking of collections referenced via relationship/upload fields. |
| `publishHandler` | `(changes: ChangedDocuments) => void \| Promise<void>` | — | Custom handler called when changes are published. Receives a record mapping collection slugs to arrays of changed document IDs. |

## Contributing

This plugin lives in the [payload-plugins](https://github.com/davincicoding-org/payload-plugins) monorepo.

### Development

```sh
pnpm install

# watch this plugin for changes
pnpm --filter payload-smart-cache dev

# run the Payload dev app (in a second terminal)
pnpm --filter dev dev
```

The `dev/` directory is a Next.js + Payload app that imports plugins via `workspace:*` — use it to test changes locally.

### Code quality

- **Formatting & linting** — handled by [Biome](https://biomejs.dev/), enforced on commit via husky + lint-staged.
- **Commits** — must follow [Conventional Commits](https://www.conventionalcommits.org/) with a valid scope (e.g. `fix(payload-smart-cache): ...`).
- **Changesets** — please include a [changeset](https://github.com/changesets/changesets) in your PR by running `pnpm release`.

### Issues & PRs

Bug reports and feature requests are welcome — [open an issue](https://github.com/davincicoding-org/payload-plugins/issues).

## License

MIT
