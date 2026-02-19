# payload-notifications

## 0.1.2

### Patch Changes

- [`d9c65b4`](https://github.com/davincicoding-org/payload-plugins/commit/d9c65b4790095247384d233522945d16418792bc) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Internall changes

## 0.1.1

### Patch Changes

- [`bc347db`](https://github.com/davincicoding-org/payload-plugins/commit/bc347db70f32bd24830bdb7cae25d7d477f0d4b5) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Strip declare module 'payload' augmentation from built payload-types.d.ts. Previously, each plugin shipped its own module augmentation with a partial Config, causing CollectionSlug to narrow to only the common subset when multiple plugins were installed together.
