---
paths:
  - "**/*.{ts,tsx}"
---

# Type Safety

## Strict Mode

Every `tsconfig.json` must enable strict mode with additional strictness flags.

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

## Prefer `unknown` Over `any`

Never use `any`. It disables type checking entirely. Use `unknown` and narrow explicitly.

```typescript
function parse(raw: unknown): string {
  if (typeof raw === "string") return raw;
  throw new Error(`Expected string, got ${typeof raw}`);
}
```

## Readonly by Default

{{enforceReadonly:boolean:true:"Enforce readonly on types and parameters"}}

Mark properties as `readonly` on types you define and control. Use
`Readonly<T>` and `ReadonlyArray<T>` for function parameters and
internal data structures. When types are derived from or must conform to
external APIs (ORMs, CMS schemas, framework state), match the library's
mutability contract — adding `readonly` to types the framework expects
to mutate creates type conflicts without safety benefit.

```typescript
interface User {
  readonly id: string;
  readonly name: string;
}
```

```typescript
function process(items: ReadonlyArray<Item>): Item[] {
  return items.filter((i) => i.active);
}
```

## Explicit Return Types on Exported Functions

Annotate return types on exported functions at package boundaries and for
non-trivial return shapes. This catches accidental API changes and serves
as documentation. UI components whose return type is inherent to the
framework are exempt.

```typescript
export function total(items: readonly CartItem[]): number {
  return items.reduce((s, i) => s + i.price * i.qty, 0);
}
```

## `as const` for Literal Types

Use `as const` to create narrow literal types from constant values.

```typescript
const ROLES = ["admin", "editor", "viewer"] as const;
type Role = (typeof ROLES)[number];
```

## Avoid Floating Promises

Every `Promise` must be `await`ed, returned, or explicitly voided with `void`.

```typescript
await sendNotification(user);     // awaited
return sendNotification(user);    // returned
void sendNotification(user);      // intentional fire-and-forget
```

## Avoid Non-Null Assertions

The postfix `!` operator bypasses the compiler. Use explicit null checks instead.

```typescript
// Avoid: user!.name
if (!user) throw new Error("User is required");
const name = user.name;
```

## Avoid Type Assertions

`as` casts bypass the compiler. Prefer type guards or Zod validation.

```typescript
function isUser(data: unknown): data is User {
  return typeof data === "object" && data !== null
    && "id" in data && "name" in data;
}
```

**Exception:** Type assertions are acceptable when a framework's type
definitions do not cover a valid use case and no type guard alternative
exists (e.g., CSS custom properties in style objects). Keep these
assertions minimal and co-located with the framework boundary.

## No Legacy Patterns

Do not use `namespace` or `module` declarations. Use ES module `import`/`export` syntax.
