---
"payload-intl": patch
---

Fix infinite re-render loop when typing in message input fields

The `MessagesField` component had a circular state update: `form.watch()` called
`setValue()` on every react-hook-form sync — including when Payload pushed the
same value back via `useForm({ values })`. This caused a
`setValue → re-render → watch → setValue` loop that hit React's maximum update
depth. The fix tracks the last pushed value in a ref and skips redundant updates.
