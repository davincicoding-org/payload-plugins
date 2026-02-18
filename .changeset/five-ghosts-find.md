---
"payload-clienthub": patch
"payload-discussions": patch
"payload-intl": patch
"payload-invitations": patch
"payload-notifications": patch
"payload-smart-cache": patch
"payload-smart-deletion": patch
---

Strip declare module 'payload' augmentation from built payload-types.d.ts. Previously, each plugin shipped its own module augmentation with a partial Config, causing CollectionSlug to narrow to only the common subset when multiple plugins were installed together.
