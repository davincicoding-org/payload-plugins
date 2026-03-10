---
"payload-invitations": minor
---

Add named verification flows for non-invite user creation paths

The plugin now accepts a `verificationFlows` option that maps flow names to independent email sender, template, and verification URL configurations. Consumers trigger a flow by passing `_verificationFlow: '<name>'` during `payload.create`. This enables use cases like self-signup where the user already has a password and needs a different email template than the admin-invite flow.

New exports:
- `verifyAndLogin` — token-only verification utility that sets `joinedAt`, marks the user as verified, and returns a session cookie without requiring a password
- `VerificationFlowConfig` — type for defining flow configurations
- `POST /invitations-plugin/verify-and-login` — HTTP endpoint wrapping `verifyAndLogin`
