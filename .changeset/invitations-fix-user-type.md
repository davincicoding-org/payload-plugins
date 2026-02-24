---
"payload-invitations": patch
---

Use `TypedUser` from Payload for `generateInvitationEmailHTML` and `generateInvitationEmailSubject` callbacks so consumers get their own User type instead of the plugin's internal one.
