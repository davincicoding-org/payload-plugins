---
"payload-intl": patch
---

Fix persistent infinite re-render loop in MessagesField and MessageInput

Two root causes were addressed:

1. `OnChangePlugin` fired on selection changes (focus/blur), causing empty fields
   to emit `onChange("")` which triggered the watch → setValue cascade. Added
   `ignoreSelectionChange` so only content edits fire the handler.

2. `useForm({ values })` created a controlled auto-sync loop — every Payload value
   reference change triggered a full RHF sync and watch notification. Switched to
   `defaultValues` with manual `form.reset()` gated by a stable, key-order-independent
   JSON comparison (`stableStringify`), so each direction (Payload → RHF, RHF → Payload)
   only fires when the data genuinely differs.
