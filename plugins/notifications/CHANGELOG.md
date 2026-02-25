# payload-notifications

## 0.1.10

### Patch Changes

- [`5afc8e9`](https://github.com/davincicoding-org/payload-plugins/commit/5afc8e9eea61ad54e2da35bf6b27f928c9b29093) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Replace `defineProcedure` with plain `EndpointConfig` objects and separate `/client` and `/server` entrypoints.

  - `@davincicoding/payload-plugin-kit` exports `EndpointConfig`, `InferInput`, `InferOutput` from the main barrel
  - `@davincicoding/payload-plugin-kit/server` exports `createEndpointHandler` (guarded with `server-only`)
  - `@davincicoding/payload-plugin-kit/client` exports `useEndpointCallers` hook (guarded with `client-only`)
  - `generate-types` now also generates `payload-schemas.ts` via `ts-to-zod`

  **Breaking:** `defineProcedure` is removed. Update imports:

  ```ts
  // Server — replace ENDPOINTS.x.endpoint(handler)
  import { createEndpointHandler } from "@davincicoding/payload-plugin-kit/server";
  createEndpointHandler(ENDPOINTS.x, handler);

  // Client — replace ENDPOINTS.x.call(apiRoute, input)
  import { useEndpointCallers } from "@davincicoding/payload-plugin-kit/client";
  const api = useEndpointCallers(ENDPOINTS);
  api.x(input);
  ```

- Updated dependencies [[`5afc8e9`](https://github.com/davincicoding-org/payload-plugins/commit/5afc8e9eea61ad54e2da35bf6b27f928c9b29093)]:
  - @davincicoding/payload-plugin-kit@0.1.0

## 0.1.9

### Patch Changes

- [`715cea2`](https://github.com/davincicoding-org/payload-plugins/commit/715cea2735d6902bd774be5035dc14633a914fbd) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Move `defineProcedure`, `Procedure`, and `ProcedureBuilder` out of the barrel export into a dedicated `@davincicoding/payload-plugin-kit/procedure` subpath export. This prevents client bundles from pulling in `procedure.js` (which dynamically imports `payload`) when importing unrelated utilities from the barrel.

  **Breaking:** If you import `defineProcedure` from `@davincicoding/payload-plugin-kit`, update to:

  ```ts
  import { defineProcedure } from "@davincicoding/payload-plugin-kit/procedure";
  ```

- Updated dependencies [[`715cea2`](https://github.com/davincicoding-org/payload-plugins/commit/715cea2735d6902bd774be5035dc14633a914fbd)]:
  - @davincicoding/payload-plugin-kit@0.0.7

## 0.1.8

### Patch Changes

- Updated dependencies [[`f323ee7`](https://github.com/davincicoding-org/payload-plugins/commit/f323ee7da223606587b840b2b76f1c1d84424461)]:
  - @davincicoding/payload-plugin-kit@0.0.6

## 0.1.7

### Patch Changes

- [`ff02a72`](https://github.com/davincicoding-org/payload-plugins/commit/ff02a7270ab24cfd6b3938e237686e93f8b92703) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Fix peer dependencies publishing as exact versions instead of ranges. Replaced `catalog:payload-peers` references with explicit `>=` ranges in peerDependencies to work around changesets not supporting the pnpm catalog protocol. Moved `@payloadcms/db-sqlite` and `@payloadcms/richtext-lexical` from regular dependencies to optional peer dependencies in plugin-kit.

- Updated dependencies [[`ff02a72`](https://github.com/davincicoding-org/payload-plugins/commit/ff02a7270ab24cfd6b3938e237686e93f8b92703)]:
  - @davincicoding/payload-plugin-kit@0.0.5

## 0.1.6

### Patch Changes

- [`cf531b6`](https://github.com/davincicoding-org/payload-plugins/commit/cf531b62b57297b4ff8d142b17d7545841275ee4) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Refactor repo structure

- Updated dependencies [[`cf531b6`](https://github.com/davincicoding-org/payload-plugins/commit/cf531b62b57297b4ff8d142b17d7545841275ee4)]:
  - @davincicoding/payload-plugin-kit@0.0.4

## 0.1.5

### Patch Changes

- [#22](https://github.com/davincicoding-org/payload-plugins/pull/22) [`def5c00`](https://github.com/davincicoding-org/payload-plugins/commit/def5c0011fa733718249ea4fbfb929d8e221b108) Thanks [@michaelcamper](https://github.com/michaelcamper)! - fix: move @davincicoding/payload-plugin-kit from devDependencies to dependencies

  The plugin-kit package was listed as a devDependency but is imported at runtime.
  This caused "Module not found" errors for consumers after installing from npm,
  since devDependencies are not installed for published packages.

## 0.1.4

### Patch Changes

- Updated dependencies [[`1b4aa68`](https://github.com/davincicoding-org/payload-plugins/commit/1b4aa68bd191e2fc45d31ea4a417deb0b0975054)]:
  - @davincicoding/payload-utils@0.0.3

## 0.1.3

### Patch Changes

- Updated dependencies [[`eedd9c4`](https://github.com/davincicoding-org/payload-plugins/commit/eedd9c4085676c2c7c0dc9832feafadb7055caee)]:
  - @davincicoding/payload-utils@0.0.2

## 0.1.2

### Patch Changes

- [`d9c65b4`](https://github.com/davincicoding-org/payload-plugins/commit/d9c65b4790095247384d233522945d16418792bc) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Internall changes

## 0.1.1

### Patch Changes

- [`bc347db`](https://github.com/davincicoding-org/payload-plugins/commit/bc347db70f32bd24830bdb7cae25d7d477f0d4b5) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Strip declare module 'payload' augmentation from built payload-types.d.ts. Previously, each plugin shipped its own module augmentation with a partial Config, causing CollectionSlug to narrow to only the common subset when multiple plugins were installed together.
