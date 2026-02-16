---
paths:
  - "**/*.{ts,tsx}"
---

# Patterns

## Zod for Runtime Validation

Use Zod at system boundaries (API handlers, form inputs, config loading) to validate data at runtime. Derive TypeScript types from schemas with `z.infer`.

```typescript
const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});
type UserInput = z.infer<typeof UserSchema>;
```

## Environment Variables with t3-env

When a project uses environment variables, use `@t3-oss/env-core` (or
`@t3-oss/env-nextjs` for Next.js) to define and validate them. This
provides type-safe access and fails fast on missing or invalid values at
startup.

```typescript
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    API_SECRET: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: process.env,
});
```

Never access `process.env` directly. Always import from the `env` module.

**Exception:** Framework bootstrap files (e.g., instrumentation, bundler
configs) and build-system variables (e.g., `CI`, `NEXT_RUNTIME`) that
run before the app module graph is initialized or do not belong in the
app's env schema may access `process.env` directly.

## Discriminated Unions for State Modeling

Use a shared literal field to enable exhaustive pattern matching.

```typescript
type Result<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: string }
  | { status: "loading" };
```

## Exhaustive Checks with `never`

Use the `never` type to catch unhandled union variants at compile time.

```typescript
function assertNever(value: never): never {
  throw new Error(`Unhandled: ${JSON.stringify(value)}`);
}

// In a switch default branch:
default: return assertNever(shape);
```

## Branded Types for Semantic Safety

Prevent mixing structurally identical but semantically different values.

```typescript
type UserId = string & { readonly __brand: "UserId" };
type OrderId = string & { readonly __brand: "OrderId" };
```

## Generic Constraints

Constrain generics to ensure required properties exist.

```typescript
interface HasId { readonly id: string }

function findById<T extends HasId>(
  items: readonly T[], id: string
): T | undefined {
  return items.find((item) => item.id === id);
}
```

## Prefer Union Types Over Enums

Enums generate runtime code and have confusing numeric behavior. Use union types instead.

```typescript
// Prefer
type Status = "active" | "inactive" | "pending";

// Avoid
enum Status { Active = "active", Inactive = "inactive" }
```
