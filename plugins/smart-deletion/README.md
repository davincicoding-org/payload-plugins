# payload-smart-deletion

Cascading deletes for Payload CMS relationship fields, inspired by PostgreSQL referential actions.

[![npm version](https://img.shields.io/npm/v/payload-smart-deletion)](https://www.npmjs.com/package/payload-smart-deletion)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Overview

Mark relationship fields with a cascade action and the plugin handles the rest. When a document is deleted, all referenced documents are deleted too. When trash is enabled, cascades follow soft-delete and restore transitions through the entire document tree.

**Features**

- **Hard-delete cascade** -- permanently deletes referenced documents when the parent is deleted.
- **Soft-delete cascade** -- trashes referenced documents when the parent is trashed.
- **Restore cascade** -- restores referenced documents when the parent is restored.
- **Polymorphic support** -- works with single and polymorphic (`relationTo: [...]`) relationships.
- **Nested field support** -- finds cascade fields inside groups, tabs, and blocks.
- **Automatic trash propagation** -- optionally enables `trash: true` on target collections that need it.

## Installation

```sh
pnpm add payload-smart-deletion
```

## Usage

### 1. Add the plugin

**Important:** `smartDeletionPlugin` scans all collections at config time. It must be listed **after** any plugin that injects cascade relationship fields, so those fields are visible during the scan.

```ts
// payload.config.ts
import { buildConfig } from "payload";
import { discussionsPlugin } from "payload-discussions";
import { smartDeletionPlugin } from "payload-smart-deletion";

export default buildConfig({
  // ...
  plugins: [
    discussionsPlugin({ collections: ["posts"] }), // injects cascade fields
    smartDeletionPlugin(), // must come after
  ],
});
```

### 2. Mark relationship fields

Add `custom.smartDeletion: 'cascade'` to any relationship field that should cascade deletes:

```ts
const Posts: CollectionConfig = {
  slug: "posts",
  trash: true,
  fields: [
    {
      name: "comments",
      type: "relationship",
      relationTo: "comments",
      hasMany: true,
      custom: { smartDeletion: "cascade" },
    },
  ],
};
```

Deleting a post now deletes all its comments. If the post is trashed, comments are trashed too. Restoring the post restores the comments. Cascades are recursive -- if the target collection also has cascade fields, they are followed automatically.

### Plugin options

| Option            | Type      | Default | Description                                                                                                                                   |
| ----------------- | --------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `autoEnableTrash` | `boolean` | `true`  | When the source collection has `trash: true`, automatically enable `trash: true` on target collections. When `false`, logs a warning instead. |

### Trash behavior

Soft-delete and restore hooks are only registered when the source collection has `trash: true`. If a target collection does not have trash enabled:

- With `autoEnableTrash: true` (default): the plugin enables it automatically.
- With `autoEnableTrash: false`: a warning is logged and cascaded deletes will **hard-delete** target documents instead of trashing them.

## Contributing

This plugin lives in the [payload-plugins](https://github.com/davincicoding-org/payload-plugins) monorepo.

### Development

```sh
pnpm install

# watch this plugin for changes
pnpm --filter payload-smart-deletion dev

# run the Payload dev app (in a second terminal)
pnpm --filter sandbox dev
```

The `sandbox/` directory is a Next.js + Payload app that imports plugins via `workspace:*` -- use it to test changes locally.

### Code quality

- **Formatting & linting** -- handled by [Biome](https://biomejs.dev/), enforced on commit via husky + lint-staged.
- **Commits** -- must follow [Conventional Commits](https://www.conventionalcommits.org/) with a valid scope (e.g. `fix(payload-smart-deletion): ...`).
- **Changesets** -- please include a [changeset](https://github.com/changesets/changesets) in your PR by running `pnpm release`.

### Issues & PRs

Bug reports and feature requests are welcome -- [open an issue](https://github.com/davincicoding-org/payload-plugins/issues).

## License

MIT
