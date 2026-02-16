---
paths:
  - "**/*.{ts,tsx}"
---

# Data Fetching

Fetch data directly in Server Components. Use the `next` option to
control caching and revalidation.

- **Static** -- Default behavior, cached at build time.
- **ISR** -- `{ next: { revalidate: 60 } }` to revalidate periodically.
- **Dynamic** -- `{ cache: "no-store" }` to fetch on every request.

Use Server Actions (`"use server"`) for mutations. Call `revalidatePath`
or `revalidateTag` after writes to keep the UI in sync.
