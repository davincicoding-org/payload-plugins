---
paths: ["plugins/**"]
---
Non-trivial types in a plugin's public config (callbacks, complex objects) should be extracted into named types in a dedicated types file and re-exported from the plugin's entry point. This lets consumers reference these types outside of payload.config.ts (e.g. when defining the callback in a separate module).
