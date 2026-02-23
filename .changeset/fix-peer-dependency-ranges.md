---
"@davincicoding/payload-plugin-kit": patch
"@davincicoding/payload-utils": patch
"payload-smart-cache": patch
"payload-smart-deletion": patch
"payload-discussions": patch
"payload-intl": patch
"payload-clienthub": patch
"payload-notifications": patch
"payload-invitations": patch
---

Fix peer dependencies publishing as exact versions instead of ranges. Replaced `catalog:payload-peers` references with explicit `>=` ranges in peerDependencies to work around changesets not supporting the pnpm catalog protocol. Moved `@payloadcms/db-sqlite` and `@payloadcms/richtext-lexical` from regular dependencies to optional peer dependencies in plugin-kit.
