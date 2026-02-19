# Common Package Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split `@repo/common` into `@davincicoding/payload-utils` and `@davincicoding/payload-plugin-kit`, rename `packages/` to `plugins/`, and remove the internals symlink mechanism.

**Architecture:** Two published packages under `packages/`. `payload-utils` holds consumer-facing utilities. `payload-plugin-kit` depends on `payload-utils`, re-exports it, and adds developer-facing tools (procedures, field utils, build scripts). Plugins move from `packages/` to `plugins/` and import everything from `@davincicoding/payload-plugin-kit`.

**Tech Stack:** pnpm workspaces, SWC, tsc, changesets, vitest

**Design doc:** `docs/plans/2026-02-19-common-package-split-design.md`

---

### Task 1: Rename packages/ to plugins/

This is the riskiest structural change. Do it first so everything else builds on the final layout.

**Files:**
- Rename: `packages/` → `plugins/`
- Modify: `pnpm-workspace.yaml`
- Modify: `package.json` (root)
- Modify: `.changeset/config.json`
- Modify: `.github/scripts/publish.mjs`
- Modify: every `plugins/*/package.json` (repository.directory field)

**Step 1: Rename the directory**

```bash
git mv packages plugins
```

**Step 2: Update pnpm-workspace.yaml**

Replace:
```yaml
packages:
  - common
  - packages/*
  - sandbox
```

With:
```yaml
packages:
  - common
  - packages/*
  - plugins/*
  - sandbox
```

Note: `packages/*` is added for the new shared packages (created in Task 2). `common` stays until Task 7 removes it.

**Step 3: Update root package.json scripts**

Replace all `./packages/**` filters with `./plugins/**`:

```jsonc
"ci:build": "pnpm --filter='./plugins/**' build",
"ci:test": "pnpm --filter='./plugins/**' test",
```

Update `format:pkg` glob:
```jsonc
"format:pkg": "sort-package-json \"package.json\" \"plugins/*/package.json\" \"packages/*/package.json\" \"sandbox/package.json\""
```

Update `commitlint.rules.scope-enum` — add new scopes, keep old ones for now:
```jsonc
"scope-enum": [2, "always", [
  "common",
  "payload-utils",
  "payload-plugin-kit",
  "payload-clienthub",
  "payload-discussions",
  "payload-intl",
  "payload-notifications",
  "payload-invitations",
  "payload-smart-cache",
  "payload-smart-deletion",
  "sandbox",
  "root"
]]
```

**Step 4: Update .github/scripts/publish.mjs**

Change line 6:
```javascript
// Before
const packagesDir = 'packages'

// After — publish from both directories
const packagesDirs = ['packages', 'plugins']
```

Wrap the loop to iterate both directories:
```javascript
for (const packagesDir of packagesDirs) {
  let dirs
  try {
    dirs = readdirSync(packagesDir)
  } catch {
    continue
  }
  for (const dir of dirs) {
    // ... existing logic, but use packagesDir instead of hardcoded 'packages'
  }
}
```

**Step 5: Update repository.directory in each plugin's package.json**

For each plugin (`notifications`, `discussions`, `intl`, `invitations`, `smart-cache`, `smart-deletion`, `clienthub`):

Replace `"directory": "packages/<name>"` with `"directory": "plugins/<name>"`.

**Step 6: Run pnpm install to update lockfile**

```bash
pnpm install
```

**Step 7: Verify everything builds**

```bash
pnpm build
```

**Step 8: Commit**

```bash
git add -A
git commit -m "refactor(root): rename packages/ to plugins/"
```

---

### Task 2: Create @davincicoding/payload-utils package

**Files:**
- Create: `packages/payload-utils/package.json`
- Create: `packages/payload-utils/tsconfig.json`
- Create: `packages/payload-utils/src/index.ts`
- Create: `packages/payload-utils/src/urls.ts`

**Step 1: Create package.json**

Create `packages/payload-utils/package.json`:

```json
{
  "name": "@davincicoding/payload-utils",
  "version": "0.0.1",
  "description": "Shared utilities for Payload CMS plugins and applications.",
  "repository": {
    "type": "git",
    "url": "https://github.com/davincicoding-org/payload-plugins.git",
    "directory": "packages/payload-utils"
  },
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    },
    "./urls": {
      "types": "./dist/urls.d.ts",
      "import": "./dist/urls.js",
      "default": "./dist/urls.js"
    }
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "swc src -d dist --config-file .swcrc --strip-leading-paths --ignore '**/*.test.ts' && tsc -p tsconfig.build.json --emitDeclarationOnly",
    "check:types": "tsc --noEmit",
    "clean": "rm -rf dist && rm -rf node_modules",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "zod": "catalog:"
  },
  "devDependencies": {
    "@swc/cli": "^0.6.0",
    "@swc/core": "^1.11.0",
    "@types/node": "^22.5.4",
    "payload": "catalog:payload-stack",
    "typescript": "catalog:payload-stack",
    "vitest": "^3.1.2"
  },
  "peerDependencies": {
    "payload": ">=3.72.0"
  },
  "engines": {
    "node": "^18.20.2 || >=20.9.0"
  }
}
```

**Step 2: Create tsconfig.json**

Create `packages/payload-utils/tsconfig.json`:

```json
{
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2022",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "declaration": true,
    "declarationMap": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

Create `packages/payload-utils/tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Step 3: Create .swcrc**

Create `packages/payload-utils/.swcrc`:

```json
{
  "jsc": {
    "target": "esnext",
    "parser": {
      "syntax": "typescript",
      "tsx": false
    }
  },
  "module": {
    "type": "es6"
  },
  "sourceMaps": true
}
```

**Step 4: Create src/index.ts**

Copy from `common/src/index.ts` but remove the re-exports of procedure.ts, createCollectionConfigFactory, and findFields. Keep only consumer-facing code:

```typescript
import type {
  BasePayload,
  CollectionSlug,
  GlobalSlug,
  JsonObject,
  TypeWithID,
} from 'payload';
import z from 'zod';

// MARK: Types

export const documentIdSchema = z.union([z.number(), z.string()]);
export type DocumentID = TypeWithID['id'] & z.infer<typeof documentIdSchema>;

export const documentReferenceSchema = z.discriminatedUnion('entity', [
  z.object({
    entity: z.literal('collection'),
    slug: z.string(),
    id: documentIdSchema,
  }),
  z.object({
    entity: z.literal('global'),
    slug: z.string(),
  }),
]);

export type DocumentReference = z.infer<typeof documentReferenceSchema>;

// MARK: Type Guards

export const isPopulated = <T extends TypeWithID>(
  relationship: T | DocumentID,
): relationship is T => typeof relationship === 'object';

export function assertPopulated<T extends TypeWithID | null>(
  docsOrIds: (T | DocumentID)[],
  errorMessage?: (id: DocumentID) => string,
): T[];
export function assertPopulated<T extends TypeWithID | null>(
  docOrId: T | DocumentID,
  errorMessage?: (id: DocumentID) => string,
): T;
export function assertPopulated<T extends TypeWithID | null>(
  value: T | DocumentID | (T | DocumentID)[],
  errorMessage = (id: DocumentID) => `Doc is not populated: [${id}]`,
): T | T[] {
  if (value === null) return value;
  if (Array.isArray(value)) {
    return value.map((item) => assertPopulated(item, errorMessage));
  }
  if (isPopulated(value)) return value;
  throw new Error(errorMessage(value as DocumentID));
}

// MARK: Utilities

export type IdentifiableDocument = TypeWithID['id'] | TypeWithID;

export function isIdentifiableDocument(
  value: unknown,
): value is IdentifiableDocument {
  if (typeof value === 'string') return true;
  if (typeof value === 'number') return true;
  if (value === null) return false;
  if (typeof value !== 'object') return true;
  if (!('id' in value)) return false;
  return isIdentifiableDocument(value.id);
}

export const resolveDocumentID = (entity: IdentifiableDocument): DocumentID =>
  typeof entity === 'object' ? entity.id : entity;

export const uncaughtSwitchCase = (value: never) => {
  throw new Error(`Unhandled switch case: ${value}`);
};

export function fetchDocumentByReference(
  payload: BasePayload,
  ref: DocumentReference,
): Promise<JsonObject> {
  switch (ref.entity) {
    case 'collection':
      return payload.findByID({
        collection: ref.slug as CollectionSlug,
        id: ref.id,
        depth: 0,
      });
    case 'global':
      return payload.findGlobal({
        slug: ref.slug as GlobalSlug,
        depth: 0,
      });
    default:
      return uncaughtSwitchCase(ref);
  }
}

export async function updateDocumentByReference(
  payload: BasePayload,
  ref: DocumentReference,
  data: JsonObject,
) {
  switch (ref.entity) {
    case 'collection':
      return payload.update({
        collection: ref.slug as CollectionSlug,
        id: ref.id,
        data: data,
      });
    case 'global':
      return payload.updateGlobal({
        slug: ref.slug as GlobalSlug,
        data: data as any,
      });
    default:
      return uncaughtSwitchCase(ref);
  }
}

export { getAdminURL, getApiURL, getServerURL } from './urls';
```

**Step 5: Create src/urls.ts**

Copy `common/src/urls.ts` verbatim:

```typescript
import type { PayloadRequest } from 'payload';
import { formatAdminURL } from 'payload/shared';

export function getServerURL(req: PayloadRequest): string {
  if (!req.url)
    throw new Error(
      'Could not get serverURL, since request URL is not available',
    );

  const { config } = req.payload;

  if (config.serverURL) return config.serverURL;

  return `${new URL(req.url).protocol}//${req.headers.get('host')}`;
}

export function getAdminURL({
  req,
  path,
}: {
  req: PayloadRequest;
  path?: '' | `/${string}` | null;
}): string {
  return formatAdminURL({
    adminRoute: req.payload.config.routes.admin,
    serverURL: getServerURL(req),
    path,
  });
}

export function getApiURL({
  req,
  path,
}: {
  req: PayloadRequest;
  path?: '' | `/${string}` | null;
}): string {
  return formatAdminURL({
    apiRoute: req.payload.config.routes.api,
    serverURL: getServerURL(req),
    path,
  });
}
```

**Step 6: Run pnpm install**

```bash
pnpm install
```

**Step 7: Verify types**

```bash
cd packages/payload-utils && pnpm check:types
```

**Step 8: Commit**

```bash
git add packages/payload-utils
git commit -m "feat(payload-utils): create @davincicoding/payload-utils package"
```

---

### Task 3: Add tests for payload-utils

**Files:**
- Create: `packages/payload-utils/src/index.test.ts`
- Create: `packages/payload-utils/src/urls.test.ts`

**Step 1: Create index.test.ts**

Copy tests from `common/src/index.test.ts` but remove the `createCollectionConfigFactory` tests. Adjust imports to use `./index`:

```typescript
import { describe, expect, test } from 'vitest';

import {
  assertPopulated,
  documentIdSchema,
  isPopulated,
  resolveDocumentID,
} from './index';

describe('entityIdSchema', () => {
  test('validates numbers', () => {
    expect(documentIdSchema.safeParse(42).success).toBe(true);
  });

  test('validates strings', () => {
    expect(documentIdSchema.safeParse('abc-123').success).toBe(true);
  });

  test('rejects objects', () => {
    expect(documentIdSchema.safeParse({ id: 1 }).success).toBe(false);
  });

  test('rejects booleans', () => {
    expect(documentIdSchema.safeParse(true).success).toBe(false);
  });

  test('rejects null', () => {
    expect(documentIdSchema.safeParse(null).success).toBe(false);
  });
});

describe('isPopulated', () => {
  test('returns true for objects', () => {
    expect(isPopulated({ id: 1, name: 'Test' })).toBe(true);
  });

  test('returns false for number IDs', () => {
    expect(isPopulated(1)).toBe(false);
  });

  test('returns false for string IDs', () => {
    expect(isPopulated('abc-123')).toBe(false);
  });
});

describe('assertPopulated', () => {
  test('returns populated entity when given an object', () => {
    const entity = { id: 1, name: 'Test' };
    expect(assertPopulated(entity)).toBe(entity);
  });

  test('throws for a primitive ID', () => {
    expect(() => assertPopulated(42)).toThrow('Doc is not populated: [42]');
  });

  test('handles arrays of populated entities', () => {
    const entities = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ];
    expect(assertPopulated(entities)).toEqual(entities);
  });

  test('throws for arrays containing unpopulated IDs', () => {
    const mixed = [{ id: 1, name: 'A' }, 99] as Array<
      { id: number; name: string } | number
    >;
    expect(() => assertPopulated(mixed)).toThrow('Doc is not populated: [99]');
  });

  test('returns null when given null', () => {
    expect(assertPopulated(null)).toBeNull();
  });

  test('supports custom error message', () => {
    expect(() => assertPopulated(42, (id) => `Missing: ${id}`)).toThrow(
      'Missing: 42',
    );
  });
});

describe('resolveDocumentID', () => {
  test('extracts ID from a populated object', () => {
    expect(resolveDocumentID({ id: 5 })).toBe(5);
  });

  test('returns number primitive as-is', () => {
    expect(resolveDocumentID(5)).toBe(5);
  });

  test('returns string primitive as-is', () => {
    expect(resolveDocumentID('abc')).toBe('abc');
  });
});
```

**Step 2: Create urls.test.ts**

Copy `common/src/urls.test.ts` verbatim (imports already point to `./urls`).

**Step 3: Run tests**

```bash
cd packages/payload-utils && pnpm test
```

Expected: All tests pass.

**Step 4: Commit**

```bash
git add packages/payload-utils/src/*.test.ts
git commit -m "test(payload-utils): add tests for payload-utils"
```

---

### Task 4: Create @davincicoding/payload-plugin-kit package

**Files:**
- Create: `packages/payload-plugin-kit/package.json`
- Create: `packages/payload-plugin-kit/tsconfig.json`
- Create: `packages/payload-plugin-kit/tsconfig.build.json`
- Create: `packages/payload-plugin-kit/.swcrc`
- Create: `packages/payload-plugin-kit/src/index.ts`
- Create: `packages/payload-plugin-kit/src/procedure.ts`
- Create: `packages/payload-plugin-kit/src/fields.ts`
- Create: `packages/payload-plugin-kit/src/config.ts`
- Copy: `common/scripts/build.js` → `packages/payload-plugin-kit/scripts/build.js`
- Copy: `common/scripts/generate-types.js` → `packages/payload-plugin-kit/scripts/generate-types.js`
- Copy: `common/.swcrc` → `packages/payload-plugin-kit/.swcrc`

**Step 1: Create package.json**

Create `packages/payload-plugin-kit/package.json`:

```json
{
  "name": "@davincicoding/payload-plugin-kit",
  "version": "0.0.1",
  "description": "Developer toolkit for building Payload CMS plugins — procedures, field utilities, build scripts, and base configuration.",
  "repository": {
    "type": "git",
    "url": "https://github.com/davincicoding-org/payload-plugins.git",
    "directory": "packages/payload-plugin-kit"
  },
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    },
    "./base.tsconfig.json": "./tsconfig.base.json"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "plugin-build": "./scripts/build.js",
    "generate-types": "./scripts/generate-types.js"
  },
  "files": ["dist", "scripts", "tsconfig.base.json", ".swcrc"],
  "scripts": {
    "build": "swc src -d dist --config-file .swcrc --strip-leading-paths --ignore '**/*.test.ts' && tsc -p tsconfig.build.json --emitDeclarationOnly",
    "check:types": "tsc --noEmit",
    "clean": "rm -rf dist && rm -rf node_modules",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@commander-js/extra-typings": "^14.0.0",
    "@davincicoding/payload-utils": "workspace:*",
    "@swc/cli": "^0.6.0",
    "@swc/core": "^1.11.0",
    "commander": "^14.0.2",
    "tsc-alias": "^1.8.0",
    "tsx": "^4.0.0",
    "zod": "catalog:"
  },
  "devDependencies": {
    "@payloadcms/ui": "catalog:payload-stack",
    "@types/node": "^22.5.4",
    "payload": "catalog:payload-stack",
    "typescript": "catalog:payload-stack",
    "vitest": "^3.1.2"
  },
  "peerDependencies": {
    "payload": ">=3.72.0"
  },
  "engines": {
    "node": "^18.20.2 || >=20.9.0"
  }
}
```

**Step 2: Create tsconfig files**

Create `packages/payload-plugin-kit/tsconfig.base.json` (this is the base config that plugins extend, exported as `./base.tsconfig.json`):

```json
{
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2022",
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "allowJs": true,
    "checkJs": true,
    "composite": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

Create `packages/payload-plugin-kit/tsconfig.json`:

```json
{
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2022",
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "incremental": true,
    "declaration": true,
    "declarationMap": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

Create `packages/payload-plugin-kit/tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Step 3: Create .swcrc**

Copy `common/.swcrc` to `packages/payload-plugin-kit/.swcrc` (identical content — includes tsx: true for JSX support).

**Step 4: Create src/procedure.ts**

Copy `common/src/procedure.ts` verbatim.

**Step 5: Create src/fields.ts**

Copy `common/src/utils.ts` but remove `uncaughtSwitchCase` (it's in payload-utils now). Import it instead:

```typescript
import type { Field } from 'payload';
import { uncaughtSwitchCase } from '@davincicoding/payload-utils';

export type FieldWithPath<T extends Field> = T & {
  path: string[];
};

export function findFields<T extends Field>(
  fields: Field[],
  condition: (field: Field) => field is T,
  path?: string[],
): FieldWithPath<T>[];
export function findFields(
  fields: Field[],
  condition: (field: Field) => boolean,
  path?: string[],
): FieldWithPath<Field>[];
export function findFields(
  fields: Field[],
  condition: (field: Field) => boolean,
  path: string[] = [],
): FieldWithPath<Field>[] {
  return fields.flatMap((field) => {
    if (condition(field)) {
      return [
        { ...field, path: 'name' in field ? [...path, field.name] : path },
      ];
    }

    if ('fields' in field) {
      return findFields(
        field.fields,
        condition,
        'name' in field ? [...path, field.name] : path,
      );
    }

    switch (field.type) {
      case 'blocks':
        return field.blocks.flatMap((block) =>
          findFields(block.fields, condition, [...path, field.name]),
        );
      case 'tabs':
        return field.tabs.flatMap((tab) =>
          findFields(
            tab.fields,
            condition,
            'name' in tab ? [...path, tab.name] : path,
          ),
        );
      case 'text':
      case 'richText':
      case 'number':
      case 'checkbox':
      case 'date':
      case 'email':
      case 'select':
      case 'json':
      case 'code':
      case 'join':
      case 'point':
      case 'radio':
      case 'textarea':
      case 'ui':
      case 'relationship':
      case 'upload':
        return [];
      default:
        return uncaughtSwitchCase(field);
    }
  });
}
```

**Step 6: Create src/config.ts**

Extract `createCollectionConfigFactory` from `common/src/index.ts`:

```typescript
import type { CollectionConfig } from 'payload';

export const createCollectionConfigFactory =
  <T extends Record<string, unknown>>(
    factory:
      | Omit<CollectionConfig, 'slug'>
      | ((options: T & { slug: string }) => Omit<CollectionConfig, 'slug'>),
  ) =>
  (options: T & { slug: string }): CollectionConfig => ({
    slug: options.slug,
    ...(typeof factory === 'function' ? factory(options) : factory),
  });
```

**Step 7: Create src/index.ts**

Re-export everything from payload-utils plus plugin-kit-specific exports:

```typescript
// Re-export everything from payload-utils
export * from '@davincicoding/payload-utils';

// Plugin-kit specific exports
export {
  defineProcedure,
  type Procedure,
  type ProcedureBuilder,
} from './procedure';
export { findFields, type FieldWithPath } from './fields';
export { createCollectionConfigFactory } from './config';
```

**Step 8: Copy build scripts**

```bash
mkdir -p packages/payload-plugin-kit/scripts
cp common/scripts/build.js packages/payload-plugin-kit/scripts/build.js
cp common/scripts/generate-types.js packages/payload-plugin-kit/scripts/generate-types.js
```

**Step 9: Modify build.js to remove internals symlink**

In `packages/payload-plugin-kit/scripts/build.js`:

1. Remove the `ensureCommonSymlink()` and `removeCommonSymlink()` functions entirely
2. Remove all calls to `ensureCommonSymlink()` and `removeCommonSymlink()`
3. Remove the `commonSrc`, `symlinkPath` constants
4. Remove `lstatSync`, `symlinkSync`, `unlinkSync` from the fs import
5. Update the `commonDir` to point to the plugin-kit package root (it already does via `path.dirname(path.dirname(fileURLToPath(import.meta.url)))`)

The `.swcrc` reference stays — it points to plugin-kit's own `.swcrc`.

**Step 10: Run pnpm install**

```bash
pnpm install
```

**Step 11: Verify types**

```bash
cd packages/payload-plugin-kit && pnpm check:types
```

**Step 12: Commit**

```bash
git add packages/payload-plugin-kit
git commit -m "feat(payload-plugin-kit): create @davincicoding/payload-plugin-kit package"
```

---

### Task 5: Add tests for payload-plugin-kit

**Files:**
- Create: `packages/payload-plugin-kit/src/procedure.test.ts`
- Create: `packages/payload-plugin-kit/src/fields.test.ts`
- Create: `packages/payload-plugin-kit/src/config.test.ts`

**Step 1: Create procedure.test.ts**

Copy `common/src/procedure.test.ts` verbatim (imports already point to `./procedure`).

**Step 2: Create fields.test.ts**

Copy `common/src/utils.test.ts` but update imports:

```typescript
import type { Field } from 'payload';
import { describe, expect, test } from 'vitest';

import { findFields } from './fields';
```

Remove the `uncaughtSwitchCase` test — that's tested in payload-utils now.

**Step 3: Create config.test.ts**

Extract the `createCollectionConfigFactory` tests from `common/src/index.test.ts`:

```typescript
import { describe, expect, test } from 'vitest';

import { createCollectionConfigFactory } from './config';

describe('createCollectionConfigFactory', () => {
  test('produces config with slug from an object factory', () => {
    const factory = createCollectionConfigFactory<Record<string, never>>({
      labels: { singular: 'Item', plural: 'Items' },
      fields: [],
    });

    // @ts-expect-error - TODO: fix this
    const config = factory({ slug: 'items' });
    expect(config.slug).toBe('items');
    expect(config.labels).toEqual({ singular: 'Item', plural: 'Items' });
  });

  test('produces config with slug from a function factory', () => {
    const factory = createCollectionConfigFactory<{ prefix: string }>(
      ({ prefix }) => ({
        labels: { singular: `${prefix} Item`, plural: `${prefix} Items` },
        fields: [],
      }),
    );

    const config = factory({ slug: 'items' as any, prefix: 'Custom' });
    expect(config.slug).toBe('items');
    expect(config.labels).toEqual({
      singular: 'Custom Item',
      plural: 'Custom Items',
    });
  });
});
```

**Step 4: Run tests**

```bash
cd packages/payload-plugin-kit && pnpm test
```

Expected: All tests pass.

**Step 5: Commit**

```bash
git add packages/payload-plugin-kit/src/*.test.ts
git commit -m "test(payload-plugin-kit): add tests for payload-plugin-kit"
```

---

### Task 6: Migrate plugins to new packages

**Files:**
- Modify: all `plugins/*/package.json` — replace `@repo/common` with new packages
- Modify: all `plugins/*/tsconfig.json` — update extends path
- Modify: all source files importing from `@repo/common`

**Step 1: Update all plugin package.json files**

For each plugin in `plugins/`:

Remove `@repo/common` from both `dependencies` and `devDependencies`.

Add:
```jsonc
"dependencies": {
  "@davincicoding/payload-utils": "workspace:*",
  // ... existing deps
},
"devDependencies": {
  "@davincicoding/payload-plugin-kit": "workspace:*",
  // ... existing devDeps
}
```

Note: If `@repo/common` was only in `devDependencies` (not also in `dependencies`), you still need `@davincicoding/payload-utils` in `dependencies` because consumers need the types. Check each plugin — `notifications` has it in both `dependencies` AND `devDependencies`.

**Step 2: Update all plugin tsconfig.json files**

Replace:
```json
"extends": "@repo/common/base.tsconfig.json"
```

With:
```json
"extends": "@davincicoding/payload-plugin-kit/base.tsconfig.json"
```

Also remove `"exclude": [..., "src/internals/**/*.test.ts"]` — the internals pattern no longer exists. Keep other excludes.

**Step 3: Update all source imports**

Find-and-replace across all plugins:

```
@repo/common → @davincicoding/payload-plugin-kit
```

This covers all import styles:
- `from '@repo/common'` → `from '@davincicoding/payload-plugin-kit'`
- `from '@repo/common/utils'` → `from '@davincicoding/payload-plugin-kit/fields'` (if any)
- `from '@repo/common/procedure'` → `from '@davincicoding/payload-plugin-kit/procedure'` (if any)

Check if any plugins import sub-paths from `@repo/common`. If they import `@repo/common/utils`, they should now import from `@davincicoding/payload-plugin-kit` main entry (which re-exports `findFields` and `FieldWithPath`).

**Step 4: Remove prebuild symlink cleanup**

In each plugin's `package.json`, update the `prebuild` script:

Replace:
```json
"prebuild": "rm -f src/internals 2>/dev/null; pnpm check:types"
```

With:
```json
"prebuild": "pnpm check:types"
```

**Step 5: Run pnpm install**

```bash
pnpm install
```

**Step 6: Verify types across all plugins**

```bash
pnpm -r check:types
```

**Step 7: Run all tests**

```bash
pnpm -r test
```

**Step 8: Verify full build**

```bash
pnpm build
```

**Step 9: Commit**

```bash
git add -A
git commit -m "refactor(plugins): migrate all plugins from @repo/common to new packages"
```

---

### Task 7: Remove common/ package

**Files:**
- Delete: `common/` directory
- Modify: `pnpm-workspace.yaml` — remove `common` entry

**Step 1: Remove common from workspace config**

In `pnpm-workspace.yaml`, remove the `- common` line:

```yaml
packages:
  - packages/*
  - plugins/*
  - sandbox
```

**Step 2: Delete common directory**

```bash
rm -rf common
```

**Step 3: Run pnpm install**

```bash
pnpm install
```

**Step 4: Verify everything still builds**

```bash
pnpm build
```

**Step 5: Run all tests**

```bash
pnpm -r test
```

**Step 6: Remove "common" from commitlint scope-enum**

In root `package.json`, remove `"common"` from `commitlint.rules.scope-enum`.

**Step 7: Commit**

```bash
git add -A
git commit -m "chore(root): remove common/ package after split into payload-utils and payload-plugin-kit"
```

---

### Task 8: Update sandbox and verify end-to-end

**Files:**
- Modify: `sandbox/package.json` (if it references `@repo/common`)
- Modify: any sandbox source files importing from `@repo/common`

**Step 1: Check sandbox dependencies**

Check if sandbox references `@repo/common` and update accordingly.

**Step 2: Run the full dev workflow**

```bash
pnpm dev
```

Verify that watch mode works without the internals symlink.

**Step 3: Run full CI check**

```bash
pnpm ci
```

This runs: check, build, typecheck, test — everything the CI pipeline does.

**Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore(root): finalize package split — update sandbox and verify CI"
```

---

### Task 9: Add changesets for new packages

**Step 1: Create changeset for payload-utils**

```bash
pnpm changeset
```

Select `@davincicoding/payload-utils` — minor (new package).
Message: "Initial release of @davincicoding/payload-utils — shared utilities for Payload CMS"

**Step 2: Create changeset for payload-plugin-kit**

```bash
pnpm changeset
```

Select `@davincicoding/payload-plugin-kit` — minor (new package).
Message: "Initial release of @davincicoding/payload-plugin-kit — developer toolkit for building Payload plugins"

**Step 3: Commit changesets**

```bash
git add .changeset
git commit -m "chore(root): add changesets for new packages"
```
