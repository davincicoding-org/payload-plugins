# Centralize Build & Test Configuration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate duplicated `tsconfig.build.json` and `vitest.config.ts` from plugins by centralizing them in plugin-kit.

**Architecture:** Enhance `plugin-build` to auto-generate a temp `tsconfig.build.json` when none exists. Export a base vitest config from plugin-kit that plugins re-export via a one-liner. Both support plugin-level overrides.

**Tech Stack:** Node.js (build script), Vitest, vite-tsconfig-paths, TypeScript

---

### Task 1: Enhance `plugin-build` to auto-generate tsconfig.build.json

**Files:**
- Modify: `packages/plugin-kit/scripts/build.js:37-39` (tsconfig resolution)
- Modify: `packages/plugin-kit/scripts/build.js:75-141` (build logic)

**Step 1: Add the temp tsconfig generation function**

Add after line 61 (after `stripPayloadAugmentation`):

```js
/**
 * When no local tsconfig.build.json exists, generate a temporary one
 * that extends tsconfig.json and excludes test files. Returns the path
 * to the config and a cleanup function.
 */
function resolveBuildTsConfig() {
  const localBuildConfig = path.join(cwd, 'tsconfig.build.json');
  if (existsSync(localBuildConfig)) {
    return { tsconfig: 'tsconfig.build.json', cleanup: () => {} };
  }

  const tempConfig = {
    extends: './tsconfig.json',
    exclude: [
      'node_modules',
      'dist',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/*.spec.ts',
      'src/**/*.spec.tsx',
      'src/**/payload-types.ts',
    ],
  };

  const tempPath = path.join(cwd, '.tsconfig.build.tmp.json');
  writeFileSync(tempPath, JSON.stringify(tempConfig, null, 2));
  return {
    tsconfig: '.tsconfig.build.tmp.json',
    cleanup: () => {
      if (existsSync(tempPath)) rmSync(tempPath);
      const tempBuildInfo = path.join(cwd, '.tsconfig.build.tmp.tsbuildinfo');
      if (existsSync(tempBuildInfo)) rmSync(tempBuildInfo);
    },
  };
}
```

**Step 2: Replace the static tsconfig resolution**

Remove lines 37-39 (the old static `tsconfig` const). The config is now
resolved lazily inside each build path via `resolveBuildTsConfig()`.

**Step 3: Update the one-shot build block**

Replace the `else` branch (lines 126-141):

```js
} else {
  if (existsSync(path.join(cwd, 'dist')))
    rmSync(path.join(cwd, 'dist'), { recursive: true, force: true });
  for (const f of ['tsconfig.tsbuildinfo', 'tsconfig.build.tsbuildinfo']) {
    const p = path.join(cwd, f);
    if (existsSync(p)) rmSync(p);
  }

  const { tsconfig, cleanup } = resolveBuildTsConfig();
  try {
    copyAssets();
    exec(
      `swc src -d dist --config-file "${swcrc}" --strip-leading-paths --ignore "${SWC_IGNORE}"`,
    );
    exec(`tsc -p ${tsconfig} --emitDeclarationOnly`);
    exec(`tsc-alias -p ${tsconfig}`);
    stripPayloadAugmentation();
  } finally {
    cleanup();
  }
}
```

**Step 4: Update the watch mode block**

Replace the `if (opts.watch)` block (lines 75-125). The temp config must
persist while watch runs. Clean up on process exit:

```js
if (opts.watch) {
  const { tsconfig, cleanup } = resolveBuildTsConfig();

  /** @type {import('node:child_process').ChildProcess[]} */
  const children = [];
  const shutDown = () => {
    for (const c of children) c.kill();
    cleanup();
  };
  process.on('SIGINT', shutDown);
  process.on('SIGTERM', shutDown);
  process.on('exit', shutDown);

  // ... rest of watch mode (copyAssets, asset watcher, swc/tsc/tsc-alias
  // spawns) stays the same, using the `tsconfig` variable from above ...
```

**Step 5: Run a plugin build to verify**

Run: `cd plugins/intl && pnpm build`

Expected: Build succeeds using the existing local `tsconfig.build.json`.

**Step 6: Commit**

```
git add packages/plugin-kit/scripts/build.js
git commit -m "feat(plugin-kit): auto-generate tsconfig.build.json when missing"
```

---

### Task 2: Add base vitest config to plugin-kit

**Files:**
- Create: `packages/plugin-kit/vitest.config.ts`
- Modify: `packages/plugin-kit/package.json` (new export + new devDep)

**Step 1: Add vite-tsconfig-paths to plugin-kit**

Run: `cd packages/plugin-kit && pnpm add -D vite-tsconfig-paths`

**Step 2: Create the base vitest config**

Create `packages/plugin-kit/vitest.config.ts`:

```ts
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
});
```

**Step 3: Add the export and file entry to package.json**

In `packages/plugin-kit/package.json`:
- Add `"./vitest.config": "./vitest.config.ts"` to the `exports` field
- Add `"vitest.config.ts"` to the `files` array

**Step 4: Verify the export resolves**

Run: `cd plugins/intl && node -e "import.meta.resolve('@davincicoding/payload-plugin-kit/vitest.config')"`

Expected: Resolves without error.

**Step 5: Commit**

```
git add packages/plugin-kit/vitest.config.ts packages/plugin-kit/package.json pnpm-lock.yaml
git commit -m "feat(plugin-kit): export base vitest config with vite-tsconfig-paths"
```

---

### Task 3: Migrate plugins to use centralized configs

**Files:**
- Delete: `plugins/*/tsconfig.build.json` (6 files)
- Create/Replace: `plugins/*/vitest.config.ts` (7 files — all plugins)
- Modify: `plugins/intl/package.json` (remove vite-tsconfig-paths devDep)
- Modify: `plugins/notifications/package.json` (remove vite-tsconfig-paths devDep)

**Step 1: Delete all tsconfig.build.json files**

Delete these 6 files:
- `plugins/clienthub/tsconfig.build.json`
- `plugins/discussions/tsconfig.build.json`
- `plugins/intl/tsconfig.build.json`
- `plugins/invitations/tsconfig.build.json`
- `plugins/notifications/tsconfig.build.json`
- `plugins/smart-cache/tsconfig.build.json`

**Step 2: Create/replace vitest.config.ts in all 7 plugins**

Each file has identical content:

```ts
export { default } from '@davincicoding/payload-plugin-kit/vitest.config';
```

Files:
- `plugins/clienthub/vitest.config.ts` (create)
- `plugins/discussions/vitest.config.ts` (create)
- `plugins/intl/vitest.config.ts` (replace)
- `plugins/invitations/vitest.config.ts` (create)
- `plugins/notifications/vitest.config.ts` (replace)
- `plugins/smart-cache/vitest.config.ts` (create)
- `plugins/smart-deletion/vitest.config.ts` (create)

**Step 3: Remove vite-tsconfig-paths from intl and notifications**

Run: `cd plugins/intl && pnpm remove vite-tsconfig-paths`
Run: `cd plugins/notifications && pnpm remove vite-tsconfig-paths`

**Step 4: Run all plugin tests**

Run: `pnpm --filter='./plugins/**' test`

Expected: All tests pass across all plugins.

**Step 5: Run all plugin builds**

Run: `pnpm --filter='./plugins/**' build`

Expected: All builds succeed (now using auto-generated temp tsconfig.build.json).

**Step 6: Commit**

```
git add -A
git commit -m "refactor: migrate plugins to centralized build/test config"
```

---

### Task 4: Verify everything end-to-end

**Step 1: Clean build from scratch**

Run: `pnpm -r clean && pnpm install && pnpm -r build`

Expected: All packages and plugins build successfully.

**Step 2: Run full test suite**

Run: `pnpm -r test`

Expected: All tests pass.

**Step 3: Verify no temp files left behind**

Check that no `.tsconfig.build.tmp.json` files exist outside `node_modules`.

Expected: None found.

**Step 4: Verify override path works**

Temporarily add a custom `tsconfig.build.json` to one plugin (e.g., intl)
and rebuild. Verify it uses the local file instead of generating a temp one.
Then remove it.

**Step 5: Final commit if any cleanup needed**
