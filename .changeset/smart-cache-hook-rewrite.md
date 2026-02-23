---
"payload-smart-cache": minor
---

Rewrite cache invalidation to use direct hooks instead of a publish queue.

- Remove `publish-queue` collection, endpoints, and publish button
- Invalidate via `revalidateTag` and `onInvalidate` callback directly from collection/global hooks
- Build dependency graph eagerly at config time and walk dependents on change
- Make `slugs` required in `createRequestHandler`
- Re-export `OnInvalidate` and `InvalidationChange` types for consumers
