---
paths:
  - "**/*.{ts,tsx}"
---

# Project Structure

## Barrel Exports

Use `index.ts` files to create clean public APIs for directories.

```typescript
export { User } from "./user.js";
export type { UserCreateInput } from "./user.js";
```

## Path Aliases

Configure `tsconfig.json` path aliases to avoid deep relative imports.

```json
{ "compilerOptions": { "paths": { "@/*": ["src/*"] } } }
```

```typescript
import { total } from "@/utils/pricing";
```
