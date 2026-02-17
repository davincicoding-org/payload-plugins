# Default Email Templates & Email Link Helpers

## Problem

The notifications plugin skips email delivery entirely when the consumer has
not provided `email: { generateSubject, generateHTML }`. Consumers who have
configured a Payload email transport (required for password resets, etc.) get
no email notifications unless they write custom template functions.

Additionally, consumers who _do_ write custom emails have no easy way to
generate a "view notification" or "unsubscribe" link — they must hardcode
URLs themselves.

## Goals

1. Provide a **default email** so consumers only need `email: true` to get
   working email notifications (assuming an email transport is configured).
2. Expose **notification link helpers** (`openURL`, `unsubscribeURL`) to both
   the default email and custom `generateHTML`/`generateSubject` functions.
3. Add a **token-based email unsubscribe endpoint** that works without
   requiring the user to be logged in.
4. Make the **open-notification endpoint** redirect to the login page (with a
   return URL) instead of returning a 401, so email links work for users who
   are not currently authenticated.

## Design

### 1. Config Change

```ts
export interface NotificationsPluginConfig {
  // Accepts `true` for default templates, or custom config
  email?: true | NotificationEmailConfig;
  // ... rest unchanged
}
```

When `email: true`:
- Default `generateSubject` and `generateHTML` are used.
- The plugin stores a resolved `NotificationEmailConfig` in context (the
  consumer never sees the internal default functions).

When `email: { generateSubject, generateHTML }`:
- Custom functions are used, but they now receive a `links` object in their
  args (backwards-compatible addition).

When `email` is omitted:
- No change — email delivery is skipped entirely.

### 2. Email Links Type

```ts
export interface NotificationEmailLinks {
  /** Marks notification as read and redirects to its target. Requires login. */
  openURL: string;
  /** Unsubscribes the user. No login required (HMAC-signed). */
  unsubscribeURL: string;
}
```

### 3. Updated `NotificationEmailConfig`

```ts
export interface NotificationEmailConfig {
  generateSubject: (args: {
    notification: MinimalNotification;
    recipient: ResolvedUser;
    links: NotificationEmailLinks;  // NEW
  }) => string | Promise<string>;
  generateHTML: (args: {
    notification: MinimalNotification;
    recipient: ResolvedUser;
    links: NotificationEmailLinks;  // NEW
  }) => string | Promise<string>;
}
```

This is a backwards-compatible change — existing consumers' functions simply
receive an extra property they can ignore or start using.

### 4. Link Generation

Links are generated inside `sendNotificationEmail` after the notification
document has been created. The function needs access to:

- `notificationId` — for the open URL
- `recipient.id` + `notification.documentReference` — for the unsubscribe token
- `req` — to derive the server URL

**Open URL:**
```
{serverURL}/api/notifications-plugin/open?id={notificationId}
```

**Unsubscribe URL:**
```
{serverURL}/api/notifications-plugin/email-unsubscribe?token={hmacSignedToken}
```

The unsubscribe link is only generated when the notification has a
`documentReference` (unsubscribing from a specific document). When there is no
document reference, the unsubscribe URL is omitted (or points to a general
preferences page — TBD during implementation).

### 5. HMAC Token for Unsubscribe

Token payload: `userId:entity:slug:documentId` (or `userId:entity:slug` for
globals).

Signed with `crypto.createHmac('sha256', payload.secret)`.

Token format in the URL: `{base64url(payload)}:{base64url(signature)}`

The endpoint decodes, verifies the signature, extracts the fields, and calls
the existing `unsubscribe()` function. Renders a simple HTML confirmation page
on success.

No expiry — unsubscribe links should work indefinitely.

### 6. Open-Notification Endpoint Change

In `endpoints/open-notification.ts`, replace the 401 response:

```ts
// Before
if (!req.user) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

// After
if (!req.user) {
  const loginURL = getAdminURL({ req, path: '/login' });
  const currentURL = `/api/notifications-plugin/open?id=${id}`;
  return Response.redirect(
    `${loginURL}?redirect=${encodeURIComponent(currentURL)}`,
    302,
  );
}
```

Payload's built-in login flow handles the rest: user logs in, gets redirected
back to the open endpoint, which marks the notification as read and redirects
to the content.

### 7. Default Email Template

**Subject:** `New notification`

**HTML:** Minimal inline-styled email:
- Notification message text
- "View notification" button → `links.openURL`
- "Unsubscribe" text link → `links.unsubscribeURL`
- No external CSS, no images — maximum email client compatibility

### 8. Email Unsubscribe Endpoint

New endpoint:

```
GET /notifications-plugin/email-unsubscribe?token={token}
```

Flow:
1. Decode and verify the HMAC token
2. Extract `userId` and `documentReference`
3. Call existing `unsubscribe(req, userId, documentReference)`
4. Return a simple HTML page: "You have been unsubscribed"
5. On invalid token: return a simple HTML error page

No authentication required — the token _is_ the authentication.

### 9. Notify Flow Change

The `notify()` function in `api.ts` needs a small change: the notification
document must be created _before_ sending the email, so we have the
`notificationId` for the open URL.

Currently the creation and email sending are independent. The change is:
1. Create the notification document (if in-app enabled)
2. Pass the `notificationId` to `sendNotificationEmail`
3. Send the email with the generated links

If in-app is disabled but email is enabled, we still need a notification ID
for the open URL. Two options:
- Always create the notification document when email is enabled (even if
  in-app is disabled) — simplest, and the open endpoint needs the doc anyway
- Skip the open URL if no document was created

We'll go with: always create the notification doc when email is enabled. The
in-app preference only controls whether it shows in the bell UI (we can filter
by a flag or just accept that it exists in the DB).

Actually, simpler: create the doc regardless when _any_ channel needs it, and
use `inAppEnabled` only to control visibility in the bell component. This
avoids conditional logic in notify(). We can revisit if this becomes a
concern.

**Revised approach:** Keep current behavior — only create when `inAppEnabled`.
When email needs an open URL but no doc was created, fall back to the direct
`url` or document reference URL (same logic as `open-notification` endpoint
but resolved inline). This avoids creating ghost notification docs.

## Files to Create/Modify

| File | Change |
|------|--------|
| `types.ts` | Add `NotificationEmailLinks`, update `NotificationEmailConfig` args |
| `index.ts` | Accept `email: true`, resolve to default config |
| `context.ts` | Update `NotificationPluginContext.email` type |
| `helpers.ts` | Add link generation, pass links to `generateHTML`/`generateSubject` |
| `api.ts` | Pass notification ID + req to `sendNotificationEmail` |
| `endpoints/open-notification.ts` | Redirect to login instead of 401 |
| `endpoints/email-unsubscribe.ts` | New endpoint — token-based unsubscribe |
| `procedures.ts` | Register the new endpoint |
| `email-token.ts` (new) | HMAC sign/verify helpers |
| `default-email.ts` (new) | Default `generateSubject` and `generateHTML` |

## What Does NOT Change

- `onNotify` callback — unchanged
- In-app notifications — unchanged
- Existing subscribe/unsubscribe API functions — unchanged
- Notification data model — unchanged
- Bell component — unchanged
