---
"payload-smart-cache": patch
---

Defer cache invalidation with `after()` so changes made from streaming route handlers (e.g. Payload's MCP endpoint) are no longer silently dropped.
