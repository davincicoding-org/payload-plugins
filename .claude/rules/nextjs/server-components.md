---
paths:
  - "**/*.{ts,tsx}"
---

# Server Components

## Server Components by Default

Components in the App Router are Server Components by default. They run
on the server, can access databases and secrets directly, and ship zero
JavaScript to the client. Add `"use client"` only when a component needs
interactivity, hooks, or browser APIs.

## Push Client Boundaries Down

When a page needs one interactive element, do not make the entire page a
Client Component. Extract the interactive part into its own `"use client"`
component and keep the rest as a Server Component.

```tsx
// app/users/page.tsx -- Server Component
export default async function UsersPage() {
  const users = await db.user.findMany();
  return (
    <div>
      <h1>Users</h1>
      <UserList users={users} />
      <SearchFilter />  {/* only this is "use client" */}
    </div>
  );
}
```
