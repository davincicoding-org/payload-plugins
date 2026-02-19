# Common Package Split Design

Split `@repo/common` into two published packages and rename the `packages/`
directory to `plugins/`.

## Motivation

1. Provide useful utilities to plugin consumers without requiring internal
   packages
2. Publish both packages so the "internals" symlink mechanism during
   dev/build is no longer needed
3. Clean separation between consumer-facing and developer-facing code

## Package Definitions

### @davincicoding/payload-utils

Consumer-facing utilities for working with Payload CMS.

**Exports:**

| Category | Exports |
|----------|---------|
| Document types | `DocumentID`, `documentIdSchema`, `DocumentReference`, `documentReferenceSchema` |
| Type guards | `isPopulated`, `assertPopulated`, `isIdentifiableDocument` |
| Document operations | `resolveDocumentID`, `fetchDocumentByReference`, `updateDocumentByReference` |
| URL helpers | `getServerURL`, `getAdminURL`, `getApiURL` |
| Utilities | `uncaughtSwitchCase` |

### @davincicoding/payload-plugin-kit

Developer-facing toolkit for building Payload plugins. Depends on and
re-exports everything from `@davincicoding/payload-utils`.

**Exports:**

| Category | Exports |
|----------|---------|
| Procedures | `defineProcedure`, `Procedure`, `ProcedureBuilder`, `ZodLike` |
| Field utilities | `findFields`, `FieldWithPath` |
| Config utilities | `createCollectionConfigFactory` |
| Build tooling | `plugin-build` CLI, `generate-types` CLI |
| Config | Base `tsconfig.json` |
| Re-exports | Everything from `@davincicoding/payload-utils` |

## Directory Structure

```
payload-plugins/
├── packages/
│   ├── payload-utils/                @davincicoding/payload-utils
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── urls.ts
│   │   │   └── *.test.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── payload-plugin-kit/           @davincicoding/payload-plugin-kit
│       ├── src/
│       │   ├── index.ts              Re-exports payload-utils + dev exports
│       │   ├── procedure.ts
│       │   ├── fields.ts             Renamed from utils.ts
│       │   ├── config.ts             createCollectionConfigFactory
│       │   └── *.test.ts
│       ├── scripts/
│       │   ├── build.js
│       │   └── generate-types.js
│       ├── tsconfig.json             Base config exported for plugins
│       ├── .swcrc
│       └── package.json
│
├── plugins/                          Renamed from packages/
│   ├── notifications/
│   ├── discussions/
│   ├── intl/
│   ├── invitations/
│   ├── smart-cache/
│   ├── smart-deletion/
│   └── clienthub/
│
├── sandbox/
├── pnpm-workspace.yaml               packages/*, plugins/*
└── package.json
```

## Import Migration

Plugins replace all `@repo/common` imports with
`@davincicoding/payload-plugin-kit`. Since plugin-kit re-exports
everything from payload-utils, this is a straightforward find-and-replace.

```typescript
// Before
import { documentIdSchema, defineProcedure } from '@repo/common'

// After
import { documentIdSchema, defineProcedure } from '@davincicoding/payload-plugin-kit'
```

## Plugin Dependency Changes

```jsonc
// Before
{ "devDependencies": { "@repo/common": "workspace:*" } }

// After
{
  "dependencies": {
    "@davincicoding/payload-utils": "workspace:*"
  },
  "devDependencies": {
    "@davincicoding/payload-plugin-kit": "workspace:*"
  }
}
```

`payload-utils` is a runtime dependency because consumers need its types.
`payload-plugin-kit` is a dev dependency (build tools and authoring
utilities).

## Build System Changes

1. Remove the internals symlink mechanism from `build.js`
2. `plugin-build` and `generate-types` become bin exports of plugin-kit
3. Both new packages build before plugins (workspace dependency order)
4. `payload-utils` uses standard tsc/swc build

## CI Changes

- `ci:build` filter: `./packages/**` becomes `./plugins/**`
- `ci:test` filter: same change
- Both packages in `packages/` build as part of the standard `pnpm build`

## Publishing

Both packages published to npm under `@davincicoding` scope via
changesets. `payload-utils` is a dependency of `plugin-kit`, so version
bumps propagate correctly.

## Package Exports

**payload-utils:**
```jsonc
{
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./urls": { "types": "./dist/urls.d.ts", "import": "./dist/urls.js" }
  }
}
```

**payload-plugin-kit:**
```jsonc
{
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./base.tsconfig.json": "./tsconfig.json"
  },
  "bin": {
    "plugin-build": "./scripts/build.js",
    "generate-types": "./scripts/generate-types.js"
  }
}
```
