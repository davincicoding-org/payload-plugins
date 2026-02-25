---
"payload-invitations": minor
---

Add headless support for custom invitation acceptance pages.

- New `acceptInvitationURL` plugin option to redirect invitation emails to a custom frontend page
- New `getInviteData()` utility to validate tokens and fetch invited user data server-side
- New `acceptInvite()` utility to accept invitations programmatically with parsed cookie return
- Export `AcceptInvitationURLFn` type for the callback variant
- Move cookie parsing to a zod transform schema (`cookieStringSchema`)
- Add explicit return types and type-safe sensitive field stripping to utilities
