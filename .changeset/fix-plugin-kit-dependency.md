---
"payload-smart-cache": patch
"payload-smart-deletion": patch
"payload-notifications": patch
"payload-invitations": patch
"payload-discussions": patch
"payload-clienthub": patch
---

fix: move @davincicoding/payload-plugin-kit from devDependencies to dependencies

The plugin-kit package was listed as a devDependency but is imported at runtime.
This caused "Module not found" errors for consumers after installing from npm,
since devDependencies are not installed for published packages.
