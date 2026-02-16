---
paths:
  - "**/*.{ts,tsx}"
---

# Routing

## Route-Level Files

Use Next.js file conventions where they provide real value:

- **`loading.tsx`** -- Add to routes that perform async data fetching
  where the user would notice a delay. Return a skeleton that matches
  the page layout. Skip for routes that render instantly (client-only
  forms, static content) or routes managed by external frameworks
  (e.g. Payload admin).
- **`error.tsx`** -- Add to route groups that need a distinct error UI.
  Must be a Client Component. Receives `error` and `reset` props. A
  top-level `global-error.tsx` is sufficient when all routes share the
  same error treatment.
- **`not-found.tsx`** -- Shown when `notFound()` is called.

## Dynamic Imports

Use `next/dynamic` instead of `React.lazy` in Next.js. Set `ssr: false`
for components that depend on browser-only APIs.

```tsx
const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});
```
