# payload-invitations

## 0.1.9

### Patch Changes

- [`10d8141`](https://github.com/davincicoding-org/payload-plugins/commit/10d81413a9a14b385a3c5c0952f25629d887ac7a) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Use dynamic imports for runtime `payload` imports to fix "Cannot find package 'payload'" error on Vercel with Turbopack.

## 0.1.8

### Patch Changes

- [`1b04773`](https://github.com/davincicoding-org/payload-plugins/commit/1b0477340907d9fdf883850a2b3d64157a7f3742) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Use `TypedUser` from Payload for `generateInvitationEmailHTML` and `generateInvitationEmailSubject` callbacks so consumers get their own User type instead of the plugin's internal one.

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

## 0.1.0

### Minor Changes

- [`71a9c33`](https://github.com/davincicoding-org/payload-plugins/commit/71a9c33b64e576a230e7eeca75b364389dcf882f) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Simplify email field setup by always creating the virtual field instead of searching for an existing one. Add README with usage, features, and configuration options. Update internal dependency for renamed common API.

### Patch Changes

- [`bd14968`](https://github.com/davincicoding-org/payload-plugins/commit/bd14968295ee0170f3c0fedc55673d74d577678b) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Simplify email field setup by always prepending a virtual \_email field instead of searching for and mutating an existing email field.

## 0.0.3

### Patch Changes

- [`629b095`](https://github.com/davincicoding-org/payload-plugins/commit/629b095e2d4ec570f71ad7f9f26121d34c4ace6e) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Prevent inviting already invited users

## 0.0.2

### Patch Changes

- [`1740509`](https://github.com/davincicoding-org/payload-plugins/commit/17405099470100f5982d7834a13994ffa10f6e59) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Fix catalog: protocol leaking into published package.json — zod dependency now resolves to a real version
