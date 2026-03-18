---
"payload-invitations": minor
---

Add deferred invitation email support: suppress email on user creation via `context: { skipInvitationEmail: true }`, then send it later with the new `sendInvitationEmail` utility. Also adds the `/invitations-plugin/reinvite` endpoint and always registers email hooks (fixing a behavioral inconsistency when no `emailSender` was configured).
