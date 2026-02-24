# @davincicoding/payload-plugin-kit

## 0.0.7

### Patch Changes

- [`715cea2`](https://github.com/davincicoding-org/payload-plugins/commit/715cea2735d6902bd774be5035dc14633a914fbd) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Move `defineProcedure`, `Procedure`, and `ProcedureBuilder` out of the barrel export into a dedicated `@davincicoding/payload-plugin-kit/procedure` subpath export. This prevents client bundles from pulling in `procedure.js` (which dynamically imports `payload`) when importing unrelated utilities from the barrel.

  **Breaking:** If you import `defineProcedure` from `@davincicoding/payload-plugin-kit`, update to:

  ```ts
  import { defineProcedure } from "@davincicoding/payload-plugin-kit/procedure";
  ```

## 0.0.6

### Patch Changes

- [`f323ee7`](https://github.com/davincicoding-org/payload-plugins/commit/f323ee7da223606587b840b2b76f1c1d84424461) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Remove unnecessary `/* webpackIgnore: true */` magic comments from dynamic `payload` imports. Payload's `withPayload` Next.js plugin already handles externalizing `payload` in development via `serverExternalPackages`, and intentionally allows bundling in production for tree-shaking. The comments were overriding this behavior and could cause dual module instances.

## 0.0.5

### Patch Changes

- [`ff02a72`](https://github.com/davincicoding-org/payload-plugins/commit/ff02a7270ab24cfd6b3938e237686e93f8b92703) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Fix peer dependencies publishing as exact versions instead of ranges. Replaced `catalog:payload-peers` references with explicit `>=` ranges in peerDependencies to work around changesets not supporting the pnpm catalog protocol. Moved `@payloadcms/db-sqlite` and `@payloadcms/richtext-lexical` from regular dependencies to optional peer dependencies in plugin-kit.

- Updated dependencies [[`ff02a72`](https://github.com/davincicoding-org/payload-plugins/commit/ff02a7270ab24cfd6b3938e237686e93f8b92703)]:
  - @davincicoding/payload-utils@0.0.5

## 0.0.4

### Patch Changes

- [`cf531b6`](https://github.com/davincicoding-org/payload-plugins/commit/cf531b62b57297b4ff8d142b17d7545841275ee4) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Refactor repo structure

- Updated dependencies [[`cf531b6`](https://github.com/davincicoding-org/payload-plugins/commit/cf531b62b57297b4ff8d142b17d7545841275ee4)]:
  - @davincicoding/payload-utils@0.0.4

## 0.0.3

### Patch Changes

- Updated dependencies [[`1b4aa68`](https://github.com/davincicoding-org/payload-plugins/commit/1b4aa68bd191e2fc45d31ea4a417deb0b0975054)]:
  - @davincicoding/payload-utils@0.0.3

## 0.0.2

### Patch Changes

- [`eedd9c4`](https://github.com/davincicoding-org/payload-plugins/commit/eedd9c4085676c2c7c0dc9832feafadb7055caee) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Fix publishing: resolve catalog: and workspace: protocols that leaked into npm

- Updated dependencies [[`eedd9c4`](https://github.com/davincicoding-org/payload-plugins/commit/eedd9c4085676c2c7c0dc9832feafadb7055caee)]:
  - @davincicoding/payload-utils@0.0.2
