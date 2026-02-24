---
"payload-invitations": patch
"@davincicoding/payload-plugin-kit": patch
---

Remove unnecessary `/* webpackIgnore: true */` magic comments from dynamic `payload` imports. Payload's `withPayload` Next.js plugin already handles externalizing `payload` in development via `serverExternalPackages`, and intentionally allows bundling in production for tree-shaking. The comments were overriding this behavior and could cause dual module instances.
