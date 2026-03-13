---
"payload-invitations": minor
---

Remove `_email` virtual field. Users are now created with the native `email` field directly. The admin-invite flow is detected by the absence of a `password` field instead of the presence of `_email`. This is a breaking change for consumers using `_email` — replace `_email` with `email` and remove any `as never` / `as Record<string, unknown>` casts.
