# payload-invitations

## 0.5.0

### Minor Changes

- [`a8edaed`](https://github.com/davincicoding-org/payload-plugins/commit/a8edaedc3341cacba10bbc2d06250709be74cd59) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Remove `_email` virtual field. Users are now created with the native `email` field directly. The admin-invite flow is detected by the absence of a `password` field instead of the presence of `_email`. This is a breaking change for consumers using `_email` — replace `_email` with `email` and remove any `as never` / `as Record<string, unknown>` casts.

## 0.4.1

### Patch Changes

- [`48414d9`](https://github.com/davincicoding-org/payload-plugins/commit/48414d90f99e3a91ac921323573a68d524f7670f) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Pass `req` to `findByID` in send-invitation-email hook to preserve request context (tenant scoping, transactions) in multi-tenant setups

## 0.4.0

### Minor Changes

- [`70b808d`](https://github.com/davincicoding-org/payload-plugins/commit/70b808d2e37c41ab538cfbb34652b9b724e36c1a) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Add named verification flows for non-invite user creation paths

  The plugin now accepts a `verificationFlows` option that maps flow names to independent email sender, template, and verification URL configurations. Consumers trigger a flow by passing `_verificationFlow: '<name>'` during `payload.create`. This enables use cases like self-signup where the user already has a password and needs a different email template than the admin-invite flow.

  New exports:

  - `verifyAndLogin` — token-only verification utility that sets `joinedAt`, marks the user as verified, and returns a session cookie without requiring a password
  - `VerificationFlowConfig` — type for defining flow configurations
  - `POST /invitations-plugin/verify-and-login` — HTTP endpoint wrapping `verifyAndLogin`

## 0.3.1

### Patch Changes

- [`b660368`](https://github.com/davincicoding-org/payload-plugins/commit/b660368cda58b52d1ca0d96a9477f496c41a447a) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Fix email branding callbacks receiving unpopulated user relations

  The `sendInvitationEmail` hook was passing the shallow `doc` from the afterChange hook to all callbacks (`emailSender`, `generateInvitationEmailHTML`, `generateInvitationEmailSubject`, `acceptInvitationURL`). User relations like `camps` were bare IDs instead of populated objects, causing consumers to fall back to default branding.

  Changed `findByID` depth from 0 to 1 and pass the populated document to callbacks.

## 0.3.0

### Minor Changes

- [#36](https://github.com/davincicoding-org/payload-plugins/pull/36) [`3a44eb8`](https://github.com/davincicoding-org/payload-plugins/commit/3a44eb881c6c875e8d6e5114b6a1828c9463b26b) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Add custom email sender support for invitation emails.

  - New `emailSender` plugin option for custom sender address and name (static or async function)
  - Export `EmailSender` and `EmailSenderOption` types

## 0.2.1

### Patch Changes

- [`4324a78`](https://github.com/davincicoding-org/payload-plugins/commit/4324a780d52ab3624071e8517c980d3ea28193ce) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Preserve verification token after invitation acceptance so repeat visits return ALREADY_ACCEPTED instead of INVALID_TOKEN.

## 0.2.0

### Minor Changes

- [#33](https://github.com/davincicoding-org/payload-plugins/pull/33) [`8fb58e0`](https://github.com/davincicoding-org/payload-plugins/commit/8fb58e048a3ebff0c807d933da9109bd954c5ddb) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Add headless support for custom invitation acceptance pages.

  - New `acceptInvitationURL` plugin option to redirect invitation emails to a custom frontend page
  - New `getInviteData()` utility to validate tokens and fetch invited user data server-side
  - New `acceptInvite()` utility to accept invitations programmatically with parsed cookie return
  - Export `AcceptInvitationURLFn` type for the callback variant
  - Move cookie parsing to a zod transform schema (`cookieStringSchema`)
  - Add explicit return types and type-safe sensitive field stripping to utilities

## 0.1.12

### Patch Changes

- [`5afc8e9`](https://github.com/davincicoding-org/payload-plugins/commit/5afc8e9eea61ad54e2da35bf6b27f928c9b29093) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Replace `defineProcedure` with plain `EndpointConfig` objects and separate `/client` and `/server` entrypoints.

  - `@davincicoding/payload-plugin-kit` exports `EndpointConfig`, `InferInput`, `InferOutput` from the main barrel
  - `@davincicoding/payload-plugin-kit/server` exports `createEndpointHandler` (guarded with `server-only`)
  - `@davincicoding/payload-plugin-kit/client` exports `useEndpointCallers` hook (guarded with `client-only`)
  - `generate-types` now also generates `payload-schemas.ts` via `ts-to-zod`

  **Breaking:** `defineProcedure` is removed. Update imports:

  ```ts
  // Server — replace ENDPOINTS.x.endpoint(handler)
  import { createEndpointHandler } from "@davincicoding/payload-plugin-kit/server";
  createEndpointHandler(ENDPOINTS.x, handler);

  // Client — replace ENDPOINTS.x.call(apiRoute, input)
  import { useEndpointCallers } from "@davincicoding/payload-plugin-kit/client";
  const api = useEndpointCallers(ENDPOINTS);
  api.x(input);
  ```

- Updated dependencies [[`5afc8e9`](https://github.com/davincicoding-org/payload-plugins/commit/5afc8e9eea61ad54e2da35bf6b27f928c9b29093)]:
  - @davincicoding/payload-plugin-kit@0.1.0

## 0.1.11

### Patch Changes

- [`715cea2`](https://github.com/davincicoding-org/payload-plugins/commit/715cea2735d6902bd774be5035dc14633a914fbd) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Move `defineProcedure`, `Procedure`, and `ProcedureBuilder` out of the barrel export into a dedicated `@davincicoding/payload-plugin-kit/procedure` subpath export. This prevents client bundles from pulling in `procedure.js` (which dynamically imports `payload`) when importing unrelated utilities from the barrel.

  **Breaking:** If you import `defineProcedure` from `@davincicoding/payload-plugin-kit`, update to:

  ```ts
  import { defineProcedure } from "@davincicoding/payload-plugin-kit/procedure";
  ```

- Updated dependencies [[`715cea2`](https://github.com/davincicoding-org/payload-plugins/commit/715cea2735d6902bd774be5035dc14633a914fbd)]:
  - @davincicoding/payload-plugin-kit@0.0.7

## 0.1.10

### Patch Changes

- [`f323ee7`](https://github.com/davincicoding-org/payload-plugins/commit/f323ee7da223606587b840b2b76f1c1d84424461) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Remove unnecessary `/* webpackIgnore: true */` magic comments from dynamic `payload` imports. Payload's `withPayload` Next.js plugin already handles externalizing `payload` in development via `serverExternalPackages`, and intentionally allows bundling in production for tree-shaking. The comments were overriding this behavior and could cause dual module instances.

- Updated dependencies [[`f323ee7`](https://github.com/davincicoding-org/payload-plugins/commit/f323ee7da223606587b840b2b76f1c1d84424461)]:
  - @davincicoding/payload-plugin-kit@0.0.6

## 0.1.9

### Patch Changes

- [`10d8141`](https://github.com/davincicoding-org/payload-plugins/commit/10d81413a9a14b385a3c5c0952f25629d887ac7a) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Use dynamic imports for runtime `payload` imports to fix "Cannot find package 'payload'" error on Vercel with Turbopack.

## 0.1.8

### Patch Changes

- [`1b04773`](https://github.com/davincicoding-org/payload-plugins/commit/1b0477340907d9fdf883850a2b3d64157a7f3742) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Use `TypedUser` from Payload for `generateInvitationEmailHTML` and `generateInvitationEmailSubject` callbacks so consumers get their own User type instead of the plugin's internal one.

## 0.1.7

### Patch Changes

- [`ff02a72`](https://github.com/davincicoding-org/payload-plugins/commit/ff02a7270ab24cfd6b3938e237686e93f8b92703) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Fix peer dependencies publishing as exact versions instead of ranges. Replaced `catalog:payload-peers` references with explicit `>=` ranges in peerDependencies to work around changesets not supporting the pnpm catalog protocol. Moved `@payloadcms/db-sqlite` and `@payloadcms/richtext-lexical` from regular dependencies to optional peer dependencies in plugin-kit.

- Updated dependencies [[`ff02a72`](https://github.com/davincicoding-org/payload-plugins/commit/ff02a7270ab24cfd6b3938e237686e93f8b92703)]:
  - @davincicoding/payload-plugin-kit@0.0.5

## 0.1.6

### Patch Changes

- [`cf531b6`](https://github.com/davincicoding-org/payload-plugins/commit/cf531b62b57297b4ff8d142b17d7545841275ee4) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Refactor repo structure

- Updated dependencies [[`cf531b6`](https://github.com/davincicoding-org/payload-plugins/commit/cf531b62b57297b4ff8d142b17d7545841275ee4)]:
  - @davincicoding/payload-plugin-kit@0.0.4

## 0.1.5

### Patch Changes

- [#22](https://github.com/davincicoding-org/payload-plugins/pull/22) [`def5c00`](https://github.com/davincicoding-org/payload-plugins/commit/def5c0011fa733718249ea4fbfb929d8e221b108) Thanks [@michaelcamper](https://github.com/michaelcamper)! - fix: move @davincicoding/payload-plugin-kit from devDependencies to dependencies

  The plugin-kit package was listed as a devDependency but is imported at runtime.
  This caused "Module not found" errors for consumers after installing from npm,
  since devDependencies are not installed for published packages.

## 0.1.4

### Patch Changes

- Updated dependencies [[`1b4aa68`](https://github.com/davincicoding-org/payload-plugins/commit/1b4aa68bd191e2fc45d31ea4a417deb0b0975054)]:
  - @davincicoding/payload-utils@0.0.3

## 0.1.3

### Patch Changes

- Updated dependencies [[`eedd9c4`](https://github.com/davincicoding-org/payload-plugins/commit/eedd9c4085676c2c7c0dc9832feafadb7055caee)]:
  - @davincicoding/payload-utils@0.0.2

## 0.1.2

### Patch Changes

- [`d9c65b4`](https://github.com/davincicoding-org/payload-plugins/commit/d9c65b4790095247384d233522945d16418792bc) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Internall changes

## 0.1.1

### Patch Changes

- [`bc347db`](https://github.com/davincicoding-org/payload-plugins/commit/bc347db70f32bd24830bdb7cae25d7d477f0d4b5) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Strip declare module 'payload' augmentation from built payload-types.d.ts. Previously, each plugin shipped its own module augmentation with a partial Config, causing CollectionSlug to narrow to only the common subset when multiple plugins were installed together.

## 0.1.0

### Minor Changes

- [`71a9c33`](https://github.com/davincicoding-org/payload-plugins/commit/71a9c33b64e576a230e7eeca75b364389dcf882f) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Simplify email field setup by always creating the virtual field instead of searching for an existing one. Add README with usage, features, and configuration options. Update internal dependency for renamed common API.

### Patch Changes

- [`bd14968`](https://github.com/davincicoding-org/payload-plugins/commit/bd14968295ee0170f3c0fedc55673d74d577678b) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Simplify email field setup by always prepending a virtual \_email field instead of searching for and mutating an existing email field.

## 0.0.3

### Patch Changes

- [`629b095`](https://github.com/davincicoding-org/payload-plugins/commit/629b095e2d4ec570f71ad7f9f26121d34c4ace6e) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Prevent inviting already invited users

## 0.0.2

### Patch Changes

- [`1740509`](https://github.com/davincicoding-org/payload-plugins/commit/17405099470100f5982d7834a13994ffa10f6e59) Thanks [@michaelcamper](https://github.com/michaelcamper)! - Fix catalog: protocol leaking into published package.json — zod dependency now resolves to a real version
