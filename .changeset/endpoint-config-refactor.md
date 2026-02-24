---
"@davincicoding/payload-plugin-kit": minor
"payload-clienthub": patch
"payload-discussions": patch
"payload-invitations": patch
"payload-notifications": patch
---

Replace `defineProcedure` with plain `EndpointConfig` objects and separate `/client` and `/server` entrypoints.

- `@davincicoding/payload-plugin-kit` exports `EndpointConfig`, `InferInput`, `InferOutput` from the main barrel
- `@davincicoding/payload-plugin-kit/server` exports `createEndpointHandler` (guarded with `server-only`)
- `@davincicoding/payload-plugin-kit/client` exports `useEndpointCallers` hook (guarded with `client-only`)
- `generate-types` now also generates `payload-schemas.ts` via `ts-to-zod`

**Breaking:** `defineProcedure` is removed. Update imports:

```ts
// Server — replace ENDPOINTS.x.endpoint(handler)
import { createEndpointHandler } from '@davincicoding/payload-plugin-kit/server';
createEndpointHandler(ENDPOINTS.x, handler);

// Client — replace ENDPOINTS.x.call(apiRoute, input)
import { useEndpointCallers } from '@davincicoding/payload-plugin-kit/client';
const api = useEndpointCallers(ENDPOINTS);
api.x(input);
```
