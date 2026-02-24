---
"@davincicoding/payload-plugin-kit": patch
"payload-clienthub": patch
"payload-discussions": patch
"payload-invitations": patch
"payload-notifications": patch
---

Move `defineProcedure`, `Procedure`, and `ProcedureBuilder` out of the barrel export into a dedicated `@davincicoding/payload-plugin-kit/procedure` subpath export. This prevents client bundles from pulling in `procedure.js` (which dynamically imports `payload`) when importing unrelated utilities from the barrel.

**Breaking:** If you import `defineProcedure` from `@davincicoding/payload-plugin-kit`, update to:
```ts
import { defineProcedure } from '@davincicoding/payload-plugin-kit/procedure';
```
