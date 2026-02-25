# payload-intl

## 1.4.5

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

## 1.4.4

### Patch Changes

- Updated dependencies [[`715cea2`](https://github.com/davincicoding-org/payload-plugins/commit/715cea2735d6902bd774be5035dc14633a914fbd)]:
  - @davincicoding/payload-plugin-kit@0.0.7

## 1.4.3

### Patch Changes

- Updated dependencies [[`f323ee7`](https://github.com/davincicoding-org/payload-plugins/commit/f323ee7da223606587b840b2b76f1c1d84424461)]:
  - @davincicoding/payload-plugin-kit@0.0.6

## 1.4.2

### Patch Changes

- [`ff02a72`](https://github.com/davincicoding-org/payload-plugins/commit/ff02a7270ab24cfd6b3938e237686e93f8b92703) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Fix peer dependencies publishing as exact versions instead of ranges. Replaced `catalog:payload-peers` references with explicit `>=` ranges in peerDependencies to work around changesets not supporting the pnpm catalog protocol. Moved `@payloadcms/db-sqlite` and `@payloadcms/richtext-lexical` from regular dependencies to optional peer dependencies in plugin-kit.

- Updated dependencies [[`ff02a72`](https://github.com/davincicoding-org/payload-plugins/commit/ff02a7270ab24cfd6b3938e237686e93f8b92703)]:
  - @davincicoding/payload-plugin-kit@0.0.5

## 1.4.1

### Patch Changes

- [`cf531b6`](https://github.com/davincicoding-org/payload-plugins/commit/cf531b62b57297b4ff8d142b17d7545841275ee4) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Refactor repo structure

- Updated dependencies [[`cf531b6`](https://github.com/davincicoding-org/payload-plugins/commit/cf531b62b57297b4ff8d142b17d7545841275ee4)]:
  - @davincicoding/payload-plugin-kit@0.0.4

## 1.4.0

### Minor Changes

- [#22](https://github.com/davincicoding-org/payload-plugins/pull/22) [`def5c00`](https://github.com/davincicoding-org/payload-plugins/commit/def5c0011fa733718249ea4fbfb929d8e221b108) Thanks [@michaelcamper](https://github.com/michaelcamper)! - feat: add scoped messages and file-based storage

  - Replace messages collection with a global for simpler data model
  - Add scope support for organizing translations by feature/section
  - Add file storage utilities for upload-based persistence
  - Restructure ICU utilities and component layout
  - Move plugin-kit to runtime dependencies

## 1.3.2

### Patch Changes

- Updated dependencies [[`1b4aa68`](https://github.com/davincicoding-org/payload-plugins/commit/1b4aa68bd191e2fc45d31ea4a417deb0b0975054)]:
  - @davincicoding/payload-utils@0.0.3

## 1.3.1

### Patch Changes

- Updated dependencies [[`eedd9c4`](https://github.com/davincicoding-org/payload-plugins/commit/eedd9c4085676c2c7c0dc9832feafadb7055caee)]:
  - @davincicoding/payload-utils@0.0.2

## 1.3.0

### Minor Changes

- [`4965bef`](https://github.com/davincicoding-org/payload-plugins/commit/4965bef485dd7a8f2b18c50cd35b295da82eb47a) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Add dual storage strategy (`db` and `upload`) for message persistence. Default is `db` which stores translations as JSON in the database, avoiding HTTP fetches during `next build`. Auto-migrates existing documents when switching strategies.

### Patch Changes

- [`d9c65b4`](https://github.com/davincicoding-org/payload-plugins/commit/d9c65b4790095247384d233522945d16418792bc) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Internall changes

## 1.2.5

### Patch Changes

- [`bc347db`](https://github.com/davincicoding-org/payload-plugins/commit/bc347db70f32bd24830bdb7cae25d7d477f0d4b5) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Strip declare module 'payload' augmentation from built payload-types.d.ts. Previously, each plugin shipped its own module augmentation with a partial Config, causing CollectionSlug to narrow to only the common subset when multiple plugins were installed together.

## 1.2.4

### Patch Changes

- [`71a9c33`](https://github.com/davincicoding-org/payload-plugins/commit/71a9c33b64e576a230e7eeca75b364389dcf882f) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Use string type for collectionSlug option and clean up tsconfig include paths. Update internal dependency for renamed common API.

## 1.2.3

### Patch Changes

- [`39e96d5`](https://github.com/davincicoding-org/payload-plugins/commit/39e96d52476b2abb8c52fe7e076f77ac26b81008) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Improve UI

## 1.2.2

### Patch Changes

- [`1740509`](https://github.com/davincicoding-org/payload-plugins/commit/17405099470100f5982d7834a13994ffa10f6e59) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Fix catalog: protocol leaking into published package.json — zod dependency now resolves to a real version

## 1.2.1

### Patch Changes

- [`a7772b9`](https://github.com/davincicoding-org/payload-plugins/commit/a7772b9b6fdf5ee0a4d8dd8d5adc48d998f4692b) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Fix @repo/common resolution error — common utilities are now bundled into the package

## 1.2.0

### Minor Changes

- [`4a33929`](https://github.com/davincicoding-org/payload-plugins/commit/4a3392949890b1f49a2e24695a0cf9874a211fea) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Remove required styles import — styles are now bundled automatically

## 1.1.0

### Minor Changes

- [`475b53d`](https://github.com/davincicoding-org/payload-plugins/commit/475b53de49d15dc3e58394306d6dc4c88dd25a2c) Thanks [@michaelcamper](https://github.com/michaelcamper)! - allow fetchMessages to be used in edge environment

## 1.0.0

### Major Changes

- [`4bb87d9`](https://github.com/davincicoding-org/payload-plugins/commit/4bb87d9a89cd7664d74d6b2ee8a687240db4c43d) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Official 1.0 release
