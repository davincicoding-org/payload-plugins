---
"payload-smart-cache": minor
---

Add multi-tenant cache invalidation support via `tenantField` option. When set, cache tags are scoped per tenant (`posts:tenant-abc`) instead of per collection (`posts`), preventing unnecessary cache busts across tenants. Includes `createTenantRequestHandler` for Next.js 15+ and `tenantCacheTag` helper for Next.js 16+.
