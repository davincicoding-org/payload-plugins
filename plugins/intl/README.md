# payload-intl

Schema-driven internationalization for Payload CMS using ICU MessageFormat.

[![npm version](https://img.shields.io/npm/v/payload-intl)](https://www.npmjs.com/package/payload-intl)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Overview

Define your message keys as a typed schema using ICU MessageFormat syntax, then manage translations across locales in a rich admin UI with validation, autocompletion, and support for plurals, selects, dates, and tags. Messages can be fetched server-side or client-side.

**Features**

- **ICU MessageFormat** — variables, plurals, selects, number/date/time formatting, and XML-like tags.
- **Schema-driven** — define message keys and templates in a typed schema with automatic validation.
- **Rich editor UI** — message editor with variable chips, autocompletion, and inline ICU element editors.
- **JSON import** — bulk-import translations from JSON files directly in the admin UI.
- **Flexible storage** — store translations as JSON in the database (default) or as uploaded files for CDN hosting.

## Installation

```sh
pnpm add payload-intl
```

## Usage

```ts
// payload.config.ts
import { buildConfig } from "payload";
import { intlPlugin } from "payload-intl";

export default buildConfig({
  localization: {
    locales: ["en", "de", "fr"],
    defaultLocale: "en",
  },
  // ...
  plugins: [
    intlPlugin({
      schema: {
        common: {
          greeting: "[Main greeting] Hello {name}!",
          items: "{count, plural, one {# item} other {# items}}",
        },
        auth: {
          login: "Sign in",
          logout: "Sign out",
        },
      },
      tabs: true,
    }),
  ],
});
```

Fetch messages in your application:

```ts
import { fetchMessages } from "payload-intl";

const messages = await fetchMessages(payload, "en");
```

### Options

| Option           | Type                                                   | Default                      | Description                                                                                                                                             |
| ---------------- | ------------------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`         | `MessagesSchema`                                       | —                            | Required. Nested object defining message keys and ICU templates. Leaf values are ICU MessageFormat strings, optionally prefixed with a `[description]`. |
| `collectionSlug` | `string`                                               | `'messages'`                 | Slug of the collection used to store translation files.                                                                                                 |
| `editorAccess`   | `(req: PayloadRequest) => boolean \| Promise<boolean>` | `(req) => req.user !== null` | Access control function that determines who can edit messages.                                                                                          |
| `hooks`          | `MessagesHooks`                                        | `{}`                         | Collection hooks. Extends Payload's collection hooks with an additional `afterUpdate` callback fired when translations are saved.                       |
| `storage`        | `'db' \| 'upload'`                                     | `'db'`                       | `'db'` stores translations as JSON in the database. `'upload'` stores them as uploaded `.json` files for CDN/static hosting.                            |

> **Note:** Switching between storage strategies on an existing deployment is not yet supported automatically. When the database schema changes (e.g. dropping upload columns), the migration data is lost before the app can read it. A safe migration path will be provided in a future release. For now, export your translations before switching strategies.
| `tabs`           | `boolean`                                              | `false`                      | When enabled, top-level keys in the schema are rendered as tabs in the admin UI.                                                                        |

## Contributing

This plugin lives in the [payload-plugins](https://github.com/davincicoding-org/payload-plugins) monorepo.

### Development

```sh
pnpm install

# watch this plugin for changes
pnpm --filter payload-intl dev

# run the Payload dev app (in a second terminal)
pnpm --filter sandbox dev
```

The `sandbox/` directory is a Next.js + Payload app that imports plugins via `workspace:*` — use it to test changes locally.

### Code quality

- **Formatting & linting** — handled by [Biome](https://biomejs.dev/), enforced on commit via husky + lint-staged.
- **Commits** — must follow [Conventional Commits](https://www.conventionalcommits.org/) with a valid scope (e.g. `fix(payload-intl): ...`).
- **Changesets** — please include a [changeset](https://github.com/changesets/changesets) in your PR by running `pnpm release`.

### Issues & PRs

Bug reports and feature requests are welcome — [open an issue](https://github.com/davincicoding-org/payload-plugins/issues).

## License

MIT
