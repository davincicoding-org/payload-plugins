# Centralize Build & Test Configuration into Plugin-Kit

## Problem

Every plugin duplicates near-identical `tsconfig.build.json` and
`vitest.config.ts` files. The build configs all do the same thing
(extend tsconfig.json, exclude tests) and the vitest configs are
identical (enable `vite-tsconfig-paths` for `@/*` alias resolution).

## Goals

- No need for `tsconfig.build.json` in plugins
- No need for custom `vitest.config.ts` logic in plugins
- Allow plugin-level overrides when needed

## Design

### 1. Eliminate `tsconfig.build.json` from plugins

Modify `plugin-build` (`packages/plugin-kit/scripts/build.js`):

- If a local `tsconfig.build.json` exists, use it (backward compatible
  override)
- If none exists, programmatically create a temporary
  `tsconfig.build.json` that extends `./tsconfig.json` and excludes
  test files (`**/*.test.ts`, `**/*.test.tsx`, `**/*.spec.ts`,
  `**/*.spec.tsx`, `**/payload-types.ts`)
- Clean up the temp file after the build completes

### 2. Export a base vitest config from plugin-kit

New file `packages/plugin-kit/vitest.config.ts`:

```ts
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
});
```

New export in `packages/plugin-kit/package.json`:

```json
{
  "exports": {
    "./vitest.config": "./vitest.config.ts"
  }
}
```

Add `vite-tsconfig-paths` as a devDependency of plugin-kit.

### 3. Plugin consumption via re-export one-liner

Each plugin has a `vitest.config.ts` containing:

```ts
export { default } from '@davincicoding/payload-plugin-kit/vitest.config';
```

This ensures IDE tooling and Vitest CLI pick up the config naturally.

### 4. Plugin-level override

When a plugin needs custom vitest configuration, replace the one-liner:

```ts
import baseConfig from '@davincicoding/payload-plugin-kit/vitest.config';
import { mergeConfig } from 'vitest/config';

export default mergeConfig(baseConfig, {
  // plugin-specific overrides
});
```

## Changes Summary

### Plugin-kit

| Change | File |
|--------|------|
| New file | `vitest.config.ts` (base vitest config) |
| New export | `./vitest.config` in package.json |
| New devDep | `vite-tsconfig-paths` |
| Modified | `scripts/build.js` (generate temp tsconfig.build.json) |

### Per-plugin (6 plugins)

| Change | Details |
|--------|---------|
| Delete | `tsconfig.build.json` |
| Replace/create | `vitest.config.ts` as re-export one-liner |
| Remove devDep | `vite-tsconfig-paths` (intl, notifications only) |

### Final plugin structure

```
plugins/my-plugin/
  package.json          (unchanged)
  tsconfig.json         (unchanged, extends base)
  vitest.config.ts      (one-liner re-export)
  src/
```
