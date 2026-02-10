# payload-discussions

Threaded comment discussions with nested replies and author tracking for Payload CMS.

[![npm version](https://img.shields.io/npm/v/payload-discussions)](https://www.npmjs.com/package/payload-discussions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Overview

Attach threaded discussions to any collection or global in Payload. Comments support nested replies, are linked to authenticated users, and are automatically cleaned up when parent documents are deleted or restored. A ready-made sidebar component integrates directly into the admin panel.

**Features**

- **Threaded replies** -- nested comment threads with configurable maximum depth.
- **Sidebar UI** -- a field component that renders discussions in the Payload admin sidebar.
- **Lifecycle handling** -- comments follow their parent document through soft-delete, permanent delete, and restore.
- **Collection & global support** -- attach discussions to any combination of collections and globals.

## Installation

```sh
pnpm add payload-discussions
```

## Usage

```ts
// payload.config.ts
import { buildConfig } from 'payload';
import { discussionsPlugin } from 'payload-discussions';

export default buildConfig({
  // ...
  plugins: [
    discussionsPlugin({
      collections: ['posts', 'pages'],
      globals: ['settings'],
    }),
  ],
});
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `collections` | `CollectionSlug[]` | `[]` | Collections to add the discussions field to. |
| `globals` | `GlobalSlug[]` | `[]` | Globals to add the discussions field to. |
| `maxCommentDepth` | `number` | `5` | Maximum nesting depth for reply threads. |
| `collectionSlug` | `CollectionSlug` | `"comments"` | Slug used for the auto-created comments collection. |

## Contributing

This plugin lives in the [payload-plugins](https://github.com/davincicoding-org/payload-plugins) monorepo.

### Development

```sh
pnpm install

# watch this plugin for changes
pnpm --filter payload-discussions dev

# run the Payload dev app (in a second terminal)
pnpm --filter dev dev
```

The `dev/` directory is a Next.js + Payload app that imports plugins via `workspace:*` — use it to test changes locally.

### Code quality

- **Formatting & linting** — handled by [Biome](https://biomejs.dev/), enforced on commit via husky + lint-staged.
- **Commits** — must follow [Conventional Commits](https://www.conventionalcommits.org/) with a valid scope (e.g. `fix(payload-discussions): ...`).
- **Changesets** — please include a [changeset](https://github.com/changesets/changesets) in your PR by running `pnpm release`.

### Issues & PRs

Bug reports and feature requests are welcome — [open an issue](https://github.com/davincicoding-org/payload-plugins/issues).

## License

MIT
