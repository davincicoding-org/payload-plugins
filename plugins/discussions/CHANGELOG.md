# payload-discussions

## 1.1.2

### Patch Changes

- [`d9c65b4`](https://github.com/davincicoding-org/payload-plugins/commit/d9c65b4790095247384d233522945d16418792bc) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Internall changes

## 1.1.1

### Patch Changes

- [`bc347db`](https://github.com/davincicoding-org/payload-plugins/commit/bc347db70f32bd24830bdb7cae25d7d477f0d4b5) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Strip declare module 'payload' augmentation from built payload-types.d.ts. Previously, each plugin shipped its own module augmentation with a partial Config, causing CollectionSlug to narrow to only the common subset when multiple plugins were installed together.

## 1.1.0

### Minor Changes

- [`bd14968`](https://github.com/davincicoding-org/payload-plugins/commit/bd14968295ee0170f3c0fedc55673d74d577678b) Thanks [@michaelcamper](https://github.com/michaelcamper)! - The onComment callback is a new public API addition, making this a minor bump. The refactor also changes the component props (documentId/documentCollectionSlug replaced with documentReference), which is technically breaking — but since the field component is a server-rendered internal detail, a minor bump is reasonable.

- [`71a9c33`](https://github.com/davincicoding-org/payload-plugins/commit/71a9c33b64e576a230e7eeca75b364389dcf882f) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Rewrite comment UI with new component architecture (CommentCard, CommentComposer, CommentThread, CommentsPanel, CommentProvider, CommentContext). Add onComment callback with thread context resolution, collapsible reply threads, auto-growing textarea, sticky reply button, relative timestamps, and single-reply enforcement. Simplify endpoints, remove old component implementations, and use string type for collectionSlug.

## 1.0.0

### Major Changes

- [`9dd830b`](https://github.com/davincicoding-org/payload-plugins/commit/9dd830bab3dd401ae4f0814d2a05020dcb3fdaee) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Initial release

## 0.0.2

### Patch Changes

- [`1740509`](https://github.com/davincicoding-org/payload-plugins/commit/17405099470100f5982d7834a13994ffa10f6e59) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Fix catalog: protocol leaking into published package.json — zod dependency now resolves to a real version
