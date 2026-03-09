---
"payload-invitations": patch
---

Fix email branding callbacks receiving unpopulated user relations

The `sendInvitationEmail` hook was passing the shallow `doc` from the afterChange hook to all callbacks (`emailSender`, `generateInvitationEmailHTML`, `generateInvitationEmailSubject`, `acceptInvitationURL`). User relations like `camps` were bare IDs instead of populated objects, causing consumers to fall back to default branding.

Changed `findByID` depth from 0 to 1 and pass the populated document to callbacks.
