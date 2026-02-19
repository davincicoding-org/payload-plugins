# payload-invitations

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
