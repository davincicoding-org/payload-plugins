# payload-invitations

Invite-only user onboarding for Payload CMS with email invitations, token-based acceptance, and automatic password setup.

[![npm version](https://img.shields.io/npm/v/payload-invitations)](https://www.npmjs.com/package/payload-invitations)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Overview

Payload lets anyone with admin access create users, but there is no built-in way to invite someone by email and let them set their own password. This plugin turns user creation into an invitation flow: admins enter only an email, the plugin sends an invitation link, and the invitee chooses a password on a branded acceptance page. It hooks into Payload's existing email-verification mechanism so there is no extra collection to manage.

**Features**

- **Email-only creation** -- admins enter just an email. Password and auth fields are hidden automatically.
- **Customizable invitation email** -- full control over the email subject and HTML body.
- **Branded acceptance page** -- invitees set their own password and are logged in immediately.
- **Headless support** -- use your own frontend for the acceptance page with server-side utilities for token validation and invite acceptance.

## Installation

```sh
pnpm add payload-invitations
```

## Usage

```ts
// payload.config.ts
import { buildConfig } from "payload";
import { invitationsPlugin } from "payload-invitations";

export default buildConfig({
  // ...
  plugins: [invitationsPlugin()],
});
```

To customize the invitation email:

```ts
invitationsPlugin({
  generateInvitationEmailHTML: ({ invitationURL, user }) =>
    `<p>Hi ${user.name}, <a href="${invitationURL}">accept your invitation</a>.</p>`,
  generateInvitationEmailSubject: () => "You're invited!",
})
```

> **Prerequisites:** Your Payload config must have `admin.user` set to a valid auth collection and an email adapter configured. The plugin warns and no-ops if either is missing.

### Options

| Option                          | Type                                                        | Default                               | Description                                          |
| ------------------------------- | ----------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------- |
| `acceptInvitationURL`           | `string \| AcceptInvitationURLFn`                           | Built-in admin page                   | Custom URL for the accept-invitation page. See [Headless Usage](#headless-usage). |
| `emailSender`                   | `EmailSender \| EmailSenderOption`                          | Payload email adapter defaults        | Custom sender address and name for invitation emails. See [Custom Email Sender](#custom-email-sender). |
| `generateInvitationEmailHTML`   | `(args: { req, invitationURL, user }) => string \| Promise` | Simple HTML with an acceptance link   | Customize the invitation email body.                 |
| `generateInvitationEmailSubject`| `(args: { req, invitationURL, user }) => string \| Promise` | `"You have been invited"`             | Customize the invitation email subject line.         |
| `verificationFlows`             | `Record<string, VerificationFlowConfig>`                    | —                                     | Named flows for non-invite creation paths (e.g., self-signup). See [Verification Flows](#verification-flows). |

### Custom Email Sender

By default, invitation emails are sent from the address configured in your Payload email adapter. To use a different sender (e.g., per-tenant branding in a multi-tenant setup), use the `emailSender` option:

```ts
// Static sender
invitationsPlugin({
  emailSender: { email: "noreply@acme.com", name: "Acme Corp" },
})
```

For dynamic resolution (e.g., from a tenant document):

```ts
invitationsPlugin({
  emailSender: async ({ req, user }) => {
    const tenant = await req.payload.findByID({
      collection: "tenants",
      id: user.tenant,
    });
    return { email: tenant.senderEmail, name: tenant.senderName };
  },
})
```

### Headless Usage

If you have a custom frontend for accepting invitations, set `acceptInvitationURL` to point invitation emails to your page instead of the built-in admin view:

```ts
invitationsPlugin({
  acceptInvitationURL: "https://myapp.com/accept-invite",
})
```

For dynamic URLs, pass a function:

```ts
invitationsPlugin({
  acceptInvitationURL: ({ token, user, req, defaultURL }) => {
    return `https://myapp.com/accept-invite?token=${token}`;
  },
})
```

On your custom page, use the server-side utilities to validate tokens and accept invitations:

```ts
import { getInviteData, acceptInvite } from "payload-invitations";

// Validate a token and get the invited user's data
const result = await getInviteData({ token, payload });
if (result.success) {
  console.log(result.user.email);
} else {
  console.log(result.error); // 'INVALID_TOKEN' | 'ALREADY_ACCEPTED'
}

// Accept the invitation (sets password, verifies user, logs in)
const acceptance = await acceptInvite({ token, password, payload });
if (acceptance.success) {
  // Set the auth cookie in your response
  cookies().set(
    acceptance.cookie.name,
    acceptance.cookie.value,
    acceptance.cookie.options,
  );
}
```

### Verification Flows

For user creation paths beyond admin invitations (e.g., self-signup), the plugin supports named **verification flows**. Each flow has its own email sender, email template, and verification URL — independent of the top-level invitation config.

```ts
invitationsPlugin({
  verificationFlows: {
    "self-signup": {
      emailSender: { email: "noreply@myapp.com", name: "MyApp" },
      generateEmailHTML: async ({ verificationURL, user }) =>
        `<p>Welcome ${user.email}! <a href="${verificationURL}">Verify your account</a>.</p>`,
      generateEmailSubject: async () => "Verify your account",
      acceptInvitationURL: "https://myapp.com/verify",
    },
  },
})
```

**Creating a user with a verification flow:**

```ts
await payload.create({
  collection: "users",
  data: {
    email: "newuser@example.com",
    password: "their-chosen-password",
    _verificationFlow: "self-signup",
  },
});
```

The `_verificationFlow` virtual field tells the plugin which flow to use. The user is created with their own password (no auto-generation), and the flow's email template is sent instead of the default invitation email.

**Verifying a self-signup user:**

After the user clicks the verification link, use `verifyAndLogin` to verify the token and get a session cookie — no password required:

```ts
import { verifyAndLogin } from "payload-invitations";

const result = await verifyAndLogin({ token, payload });
if (result.success) {
  cookies().set(
    result.cookie.name,
    result.cookie.value,
    result.cookie.options,
  );
}
```

There is also an HTTP endpoint at `POST /api/invitations-plugin/verify-and-login` that accepts `{ token }` in the request body.

## Contributing

This plugin lives in the [payload-plugins](https://github.com/davincicoding-org/payload-plugins) monorepo.

### Development

```sh
pnpm install

# watch this plugin for changes
pnpm --filter payload-invitations dev

# run the Payload dev app (in a second terminal)
pnpm --filter sandbox dev
```

The `sandbox/` directory is a Next.js + Payload app that imports plugins via `workspace:*` -- use it to test changes locally.

### Code quality

- **Formatting & linting** -- handled by [Biome](https://biomejs.dev/), enforced on commit via husky + lint-staged.
- **Commits** -- must follow [Conventional Commits](https://www.conventionalcommits.org/) with a valid scope (e.g. `fix(payload-invitations): ...`).
- **Changesets** -- please include a [changeset](https://github.com/changesets/changesets) in your PR by running `pnpm release`.

### Issues & PRs

Bug reports and feature requests are welcome -- [open an issue](https://github.com/davincicoding-org/payload-plugins/issues).

## License

MIT
