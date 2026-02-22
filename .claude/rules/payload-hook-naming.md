---
paths: ["plugins/**"]
---
Name hooks by what they do, not when they are triggered — the trigger point is already conveyed by the hook's type signature and where it is attached. Export each hook individually. When a hook requires external parameters from the plugin config, use a factory function that returns a single hook.
