# payload-smart-deletion

## 1.0.8

### Patch Changes

- [`ff02a72`](https://github.com/davincicoding-org/payload-plugins/commit/ff02a7270ab24cfd6b3938e237686e93f8b92703) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Fix peer dependencies publishing as exact versions instead of ranges. Replaced `catalog:payload-peers` references with explicit `>=` ranges in peerDependencies to work around changesets not supporting the pnpm catalog protocol. Moved `@payloadcms/db-sqlite` and `@payloadcms/richtext-lexical` from regular dependencies to optional peer dependencies in plugin-kit.

- Updated dependencies [[`ff02a72`](https://github.com/davincicoding-org/payload-plugins/commit/ff02a7270ab24cfd6b3938e237686e93f8b92703)]:
  - @davincicoding/payload-plugin-kit@0.0.5

## 1.0.7

### Patch Changes

- [`cf531b6`](https://github.com/davincicoding-org/payload-plugins/commit/cf531b62b57297b4ff8d142b17d7545841275ee4) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Refactor repo structure

- Updated dependencies [[`cf531b6`](https://github.com/davincicoding-org/payload-plugins/commit/cf531b62b57297b4ff8d142b17d7545841275ee4)]:
  - @davincicoding/payload-plugin-kit@0.0.4

## 1.0.6

### Patch Changes

- [#22](https://github.com/davincicoding-org/payload-plugins/pull/22) [`def5c00`](https://github.com/davincicoding-org/payload-plugins/commit/def5c0011fa733718249ea4fbfb929d8e221b108) Thanks [@michaelcamper](https://github.com/michaelcamper)! - fix: move @davincicoding/payload-plugin-kit from devDependencies to dependencies

  The plugin-kit package was listed as a devDependency but is imported at runtime.
  This caused "Module not found" errors for consumers after installing from npm,
  since devDependencies are not installed for published packages.

## 1.0.5

### Patch Changes

- Updated dependencies [[`1b4aa68`](https://github.com/davincicoding-org/payload-plugins/commit/1b4aa68bd191e2fc45d31ea4a417deb0b0975054)]:
  - @davincicoding/payload-utils@0.0.3

## 1.0.4

### Patch Changes

- Updated dependencies [[`eedd9c4`](https://github.com/davincicoding-org/payload-plugins/commit/eedd9c4085676c2c7c0dc9832feafadb7055caee)]:
  - @davincicoding/payload-utils@0.0.2

## 1.0.3

### Patch Changes

- [`d9c65b4`](https://github.com/davincicoding-org/payload-plugins/commit/d9c65b4790095247384d233522945d16418792bc) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Internall changes

## 1.0.2

### Patch Changes

- [`bc347db`](https://github.com/davincicoding-org/payload-plugins/commit/bc347db70f32bd24830bdb7cae25d7d477f0d4b5) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Strip declare module 'payload' augmentation from built payload-types.d.ts. Previously, each plugin shipped its own module augmentation with a partial Config, causing CollectionSlug to narrow to only the common subset when multiple plugins were installed together.

## 1.0.1

### Patch Changes

- [`bd14968`](https://github.com/davincicoding-org/payload-plugins/commit/bd14968295ee0170f3c0fedc55673d74d577678b) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Update internal import to use renamed resolveDocumentID utility from @repo/common.

- [`71a9c33`](https://github.com/davincicoding-org/payload-plugins/commit/71a9c33b64e576a230e7eeca75b364389dcf882f) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Update internal dependency for renamed common API (resolveForeignKey → resolveDocumentID). Rename typecheck script to check:types for consistency.

## 1.0.0

### Major Changes

- [`9dd830b`](https://github.com/davincicoding-org/payload-plugins/commit/9dd830bab3dd401ae4f0814d2a05020dcb3fdaee) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Initial release
