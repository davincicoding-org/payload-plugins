---
"payload-invitations": patch
---

Pass `req` to `findByID` in send-invitation-email hook to preserve request context (tenant scoping, transactions) in multi-tenant setups
