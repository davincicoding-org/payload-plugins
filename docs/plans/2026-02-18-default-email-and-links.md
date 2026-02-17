# Default Email & Email Links Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add default email templates, email link helpers (open + unsubscribe), and a token-based email unsubscribe endpoint to the notifications plugin.

**Architecture:** The email config type expands to accept `true` for defaults. A new HMAC token module signs/verifies unsubscribe tokens using `payload.secret`. Link generation happens in `helpers.ts` and is passed to both default and custom email templates. A new GET endpoint handles token-based unsubscribe without authentication.

**Tech Stack:** Node.js `crypto` for HMAC-SHA256, Vitest for tests, Payload CMS endpoints via `defineProcedure`.

**Design doc:** `docs/plans/2026-02-18-default-email-and-links-design.md`

---

### Task 1: HMAC Token Module

Create the sign/verify helpers for email unsubscribe tokens.

**Files:**
- Create: `packages/notifications/src/email-token.ts`
- Test: `packages/notifications/src/email-token.test.ts`

**Step 1: Write the failing tests**

```ts
// packages/notifications/src/email-token.test.ts
import { describe, expect, it } from 'vitest';
import { signUnsubscribeToken, verifyUnsubscribeToken } from './email-token';

const SECRET = 'test-secret-key-for-hmac';

describe('signUnsubscribeToken', () => {
  it('should produce a string with payload and signature separated by dot', () => {
    const token = signUnsubscribeToken(SECRET, {
      userId: 'user-1',
      documentReference: { entity: 'collection', slug: 'posts', id: '42' },
    });
    expect(token).toBeTypeOf('string');
    expect(token.split('.')).toHaveLength(2);
  });

  it('should produce different tokens for different inputs', () => {
    const a = signUnsubscribeToken(SECRET, {
      userId: 'user-1',
      documentReference: { entity: 'collection', slug: 'posts', id: '42' },
    });
    const b = signUnsubscribeToken(SECRET, {
      userId: 'user-2',
      documentReference: { entity: 'collection', slug: 'posts', id: '42' },
    });
    expect(a).not.toBe(b);
  });
});

describe('verifyUnsubscribeToken', () => {
  it('should return the payload for a valid token', () => {
    const token = signUnsubscribeToken(SECRET, {
      userId: 'user-1',
      documentReference: { entity: 'collection', slug: 'posts', id: '42' },
    });
    const result = verifyUnsubscribeToken(SECRET, token);
    expect(result).toEqual({
      userId: 'user-1',
      documentReference: { entity: 'collection', slug: 'posts', id: '42' },
    });
  });

  it('should return null for a tampered token', () => {
    const token = signUnsubscribeToken(SECRET, {
      userId: 'user-1',
      documentReference: { entity: 'collection', slug: 'posts', id: '42' },
    });
    const tampered = `x${token.slice(1)}`;
    expect(verifyUnsubscribeToken(SECRET, tampered)).toBeNull();
  });

  it('should return null for a token signed with a different secret', () => {
    const token = signUnsubscribeToken('wrong-secret', {
      userId: 'user-1',
      documentReference: { entity: 'collection', slug: 'posts', id: '42' },
    });
    expect(verifyUnsubscribeToken(SECRET, token)).toBeNull();
  });

  it('should return null for malformed input', () => {
    expect(verifyUnsubscribeToken(SECRET, 'not-a-token')).toBeNull();
    expect(verifyUnsubscribeToken(SECRET, '')).toBeNull();
  });

  it('should handle globals without documentId', () => {
    const token = signUnsubscribeToken(SECRET, {
      userId: 'user-1',
      documentReference: { entity: 'global', slug: 'settings' },
    });
    const result = verifyUnsubscribeToken(SECRET, token);
    expect(result).toEqual({
      userId: 'user-1',
      documentReference: { entity: 'global', slug: 'settings' },
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/notifications && pnpm test -- src/email-token.test.ts`
Expected: FAIL — module `./email-token` not found.

**Step 3: Write the implementation**

```ts
// packages/notifications/src/email-token.ts
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { DocumentReference } from '@repo/common';

interface UnsubscribePayload {
  userId: string | number;
  documentReference: Pick<DocumentReference, 'entity' | 'slug'> & {
    id?: string | number;
  };
}

/**
 * Sign an unsubscribe payload into a URL-safe token.
 * Format: `{base64url(json)}`.`{base64url(hmac)}`
 */
export function signUnsubscribeToken(
  secret: string,
  payload: UnsubscribePayload,
): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

/** Verify and decode an unsubscribe token. Returns null if invalid. */
export function verifyUnsubscribeToken(
  secret: string,
  token: string,
): UnsubscribePayload | null {
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return null;

  const data = token.slice(0, dotIndex);
  const providedSig = token.slice(dotIndex + 1);

  const expectedSig = createHmac('sha256', secret)
    .update(data)
    .digest('base64url');

  if (
    providedSig.length !== expectedSig.length ||
    !timingSafeEqual(Buffer.from(providedSig), Buffer.from(expectedSig))
  ) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString());
  } catch {
    return null;
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd packages/notifications && pnpm test -- src/email-token.test.ts`
Expected: All 7 tests PASS.

**Step 5: Commit**

```bash
git add packages/notifications/src/email-token.ts packages/notifications/src/email-token.test.ts
git commit -m "feat(payload-notifications): add HMAC token sign/verify for email unsubscribe"
```

---

### Task 2: Update Types

Add `NotificationEmailLinks` and update `NotificationEmailConfig` args.

**Files:**
- Modify: `packages/notifications/src/types.ts`

**Step 1: Add the new types**

Add `NotificationEmailLinks` interface and update `NotificationEmailConfig`:

```ts
// Add after MinimalNotification interface

export interface NotificationEmailLinks {
  /** Marks notification as read and redirects to its target. Requires login. */
  openURL: string;
  /** Unsubscribes the user from this notification source. No login required. */
  unsubscribeURL: string | undefined;
}

// Update NotificationEmailConfig — add `links` to both function args:
export interface NotificationEmailConfig {
  generateSubject: (args: {
    notification: MinimalNotification;
    recipient: ResolvedUser;
    links: NotificationEmailLinks;
  }) => string | Promise<string>;
  generateHTML: (args: {
    notification: MinimalNotification;
    recipient: ResolvedUser;
    links: NotificationEmailLinks;
  }) => string | Promise<string>;
}
```

**Step 2: Run type check**

Run: `cd packages/notifications && pnpm check:types`
Expected: Type errors in `helpers.ts` (missing `links` arg). This is expected — we fix it in Task 4.

**Step 3: Commit**

```bash
git add packages/notifications/src/types.ts
git commit -m "feat(payload-notifications): add NotificationEmailLinks type and update email config args"
```

---

### Task 3: Default Email Template

Create the default `generateSubject` and `generateHTML` functions.

**Files:**
- Create: `packages/notifications/src/default-email.ts`
- Test: `packages/notifications/src/default-email.test.ts`

**Step 1: Write the failing tests**

```ts
// packages/notifications/src/default-email.test.ts
import { describe, expect, it } from 'vitest';
import { defaultGenerateHTML, defaultGenerateSubject } from './default-email';
import type { MinimalNotification, NotificationEmailLinks, ResolvedUser } from './types';

const notification: MinimalNotification = {
  message: 'Alice commented on your post',
  event: 'comment.created',
};

const recipient = {
  id: '1',
  email: 'bob@example.com',
  displayName: 'Bob',
} as ResolvedUser;

const links: NotificationEmailLinks = {
  openURL: 'https://example.com/api/notifications-plugin/open?id=notif-1',
  unsubscribeURL: 'https://example.com/api/notifications-plugin/email-unsubscribe?token=abc',
};

describe('defaultGenerateSubject', () => {
  it('should return a static subject', () => {
    const subject = defaultGenerateSubject({ notification, recipient, links });
    expect(subject).toBe('New notification');
  });
});

describe('defaultGenerateHTML', () => {
  it('should include the notification message', () => {
    const html = defaultGenerateHTML({ notification, recipient, links });
    expect(html).toContain('Alice commented on your post');
  });

  it('should include the open URL as a link', () => {
    const html = defaultGenerateHTML({ notification, recipient, links });
    expect(html).toContain(links.openURL);
  });

  it('should include the unsubscribe URL when present', () => {
    const html = defaultGenerateHTML({ notification, recipient, links });
    expect(html).toContain(links.unsubscribeURL);
  });

  it('should omit unsubscribe link when unsubscribeURL is undefined', () => {
    const html = defaultGenerateHTML({
      notification,
      recipient,
      links: { openURL: links.openURL, unsubscribeURL: undefined },
    });
    expect(html).not.toContain('Unsubscribe');
  });

  it('should greet the recipient by display name', () => {
    const html = defaultGenerateHTML({ notification, recipient, links });
    expect(html).toContain('Bob');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/notifications && pnpm test -- src/default-email.test.ts`
Expected: FAIL — module not found.

**Step 3: Write the implementation**

```ts
// packages/notifications/src/default-email.ts
import type {
  MinimalNotification,
  NotificationEmailLinks,
  ResolvedUser,
} from './types';

interface EmailArgs {
  notification: MinimalNotification;
  recipient: ResolvedUser;
  links: NotificationEmailLinks;
}

export function defaultGenerateSubject(_args: EmailArgs): string {
  return 'New notification';
}

export function defaultGenerateHTML({ notification, recipient, links }: EmailArgs): string {
  const unsubscribeBlock = links.unsubscribeURL
    ? `<p style="margin-top:32px;font-size:12px;color:#666;">
        <a href="${links.unsubscribeURL}" style="color:#666;">Unsubscribe</a> from these notifications.
      </p>`
    : '';

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;padding:32px;">
        <tr><td>
          <p style="margin:0 0 16px;font-size:15px;color:#333;">Hi ${recipient.displayName},</p>
          <p style="margin:0 0 24px;font-size:15px;color:#333;">${notification.message}</p>
          <a href="${links.openURL}"
             style="display:inline-block;padding:10px 20px;background:#333;color:#fff;text-decoration:none;border-radius:4px;font-size:14px;">
            View notification
          </a>
          ${unsubscribeBlock}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
```

**Step 4: Run tests to verify they pass**

Run: `cd packages/notifications && pnpm test -- src/default-email.test.ts`
Expected: All 5 tests PASS.

**Step 5: Commit**

```bash
git add packages/notifications/src/default-email.ts packages/notifications/src/default-email.test.ts
git commit -m "feat(payload-notifications): add default email templates"
```

---

### Task 4: Update `helpers.ts` — Link Generation & Pass Links to Email Config

Wire up link generation and pass the `links` object to `generateHTML`/`generateSubject`.

**Files:**
- Modify: `packages/notifications/src/helpers.ts`

**Step 1: Update `sendNotificationEmail` signature and implementation**

The function needs additional data to generate links:
- `req` — to derive the server URL via `getServerURL`
- `notificationId` — for the open URL (may be undefined if in-app was disabled)
- `documentReference` — for the unsubscribe token

```ts
// packages/notifications/src/helpers.ts
import type { DocumentID, DocumentReference } from '@repo/common';
import { getServerURL } from '@repo/common';
import type { BasePayload, PayloadRequest } from 'payload';
import { signUnsubscribeToken } from './email-token';
import type {
  MinimalNotification,
  NotificationEmailConfig,
  NotificationEmailLinks,
  ResolvedUser,
} from './types';

// resolveUser stays unchanged

export function generateEmailLinks(
  req: PayloadRequest,
  {
    notificationId,
    recipientId,
    url,
    documentReference,
  }: {
    notificationId: string | undefined;
    recipientId: DocumentID;
    url: string | undefined;
    documentReference: DocumentReference | undefined;
  },
): NotificationEmailLinks {
  const serverURL = getServerURL(req);
  const apiRoute = req.payload.config.routes.api;

  // Open URL: prefer the open-notification endpoint if we have a notification doc,
  // otherwise fall back to the explicit url or '#'
  const openURL = notificationId
    ? `${serverURL}${apiRoute}/notifications-plugin/open?id=${notificationId}`
    : url ?? '#';

  // Unsubscribe URL: only available when there's a document reference
  const unsubscribeURL = documentReference
    ? (() => {
        const token = signUnsubscribeToken(req.payload.config.secret, {
          userId: recipientId,
          documentReference,
        });
        return `${serverURL}${apiRoute}/notifications-plugin/email-unsubscribe?token=${token}`;
      })()
    : undefined;

  return { openURL, unsubscribeURL };
}

export async function sendNotificationEmail(
  req: PayloadRequest,
  {
    emailConfig,
    notification,
    recipient,
    links,
  }: {
    emailConfig: NotificationEmailConfig;
    notification: MinimalNotification;
    recipient: ResolvedUser;
    links: NotificationEmailLinks;
  },
): Promise<void> {
  try {
    const [html, subject] = await Promise.all([
      emailConfig.generateHTML({ notification, recipient, links }),
      emailConfig.generateSubject({ notification, recipient, links }),
    ]);
    await req.payload.sendEmail({ to: recipient.email, subject, html });
  } catch (err) {
    console.error('[payload-notifications] Email delivery failed:', err);
  }
}
```

**Step 2: Run type check**

Run: `cd packages/notifications && pnpm check:types`
Expected: Type errors in `api.ts` (call site needs updating). Fixed in Task 6.

**Step 3: Commit**

```bash
git add packages/notifications/src/helpers.ts
git commit -m "feat(payload-notifications): add email link generation and pass links to email config"
```

---

### Task 5: Update Plugin Config — Accept `email: true`

Resolve `email: true` into the default email config before storing in context.

**Files:**
- Modify: `packages/notifications/src/index.ts`

**Step 1: Update the config type and resolve logic**

```ts
// In index.ts, update the import to include default email functions:
import { defaultGenerateHTML, defaultGenerateSubject } from './default-email';

// Update NotificationsPluginConfig:
export interface NotificationsPluginConfig {
  /** Email channel configuration. Pass `true` for default templates. */
  email?: true | NotificationEmailConfig;
  // ... rest unchanged
}

// In the notificationsPlugin function, resolve `email: true`:
const resolvedEmail: NotificationEmailConfig | undefined =
  email === true
    ? { generateSubject: defaultGenerateSubject, generateHTML: defaultGenerateHTML }
    : email;

// Then use `resolvedEmail` instead of `email` when calling attachPluginContext:
attachPluginContext(config, {
  collectionSlugs: { notifications: notifSlug, subscriptions: subsSlug },
  pollInterval,
  email: resolvedEmail,
  onNotify,
});
```

**Step 2: Update the existing test in `index.test.ts`**

Add a test case for `email: true`:

```ts
it('should accept email: true for default templates', () => {
  const plugin = notificationsPlugin({ email: true });
  expect(plugin).toBeTypeOf('function');
});
```

**Step 3: Run tests**

Run: `cd packages/notifications && pnpm test -- src/index.test.ts`
Expected: All tests PASS.

**Step 4: Export the new types from `index.ts`**

Add `NotificationEmailLinks` to the exports:

```ts
export type {
  LiveMessage,
  MessageContext,
  MessageFn,
  NotificationEmailLinks,
  NotifyInput,
} from './types';
```

**Step 5: Commit**

```bash
git add packages/notifications/src/index.ts packages/notifications/src/index.test.ts
git commit -m "feat(payload-notifications): accept email: true for default templates"
```

---

### Task 6: Update `api.ts` — Pass Links to `sendNotificationEmail`

Wire up the `notify()` function to generate links and pass them through.

**Files:**
- Modify: `packages/notifications/src/api.ts`

**Step 1: Update the notify function**

Key changes:
1. Import `generateEmailLinks` from `./helpers`
2. Capture `notificationId` from the create call (when in-app is enabled)
3. Generate links and pass to `sendNotificationEmail`

```ts
// In api.ts, update imports:
import { generateEmailLinks, resolveUser, sendNotificationEmail } from './helpers';

// In the notify function, capture the notification ID:
let notificationId: string | undefined;

if (recipient.notificationPreferences?.inAppEnabled) {
  const doc = await req.payload.create({
    collection: ctx.collectionSlugs.notifications as 'notifications',
    data: {
      recipient: input.recipient as string,
      event: input.event,
      actor: input.actor as string,
      message: serializedMessage,
      url: input.url,
      meta: input.meta,
      documentReference: input.documentReference,
    },
    req,
  });
  notificationId = String(doc.id);
}

if (ctx.email && recipient.notificationPreferences?.emailEnabled) {
  const links = generateEmailLinks(req, {
    notificationId,
    recipientId: input.recipient,
    url: input.url,
    documentReference: input.documentReference,
  });

  await sendNotificationEmail(req, {
    emailConfig: ctx.email,
    notification: {
      message: resolvedMessageString,
      event: input.event,
    },
    recipient,
    links,
  });
}
```

**Step 2: Run type check**

Run: `cd packages/notifications && pnpm check:types`
Expected: PASS — all call sites now match the updated signatures.

**Step 3: Commit**

```bash
git add packages/notifications/src/api.ts
git commit -m "feat(payload-notifications): wire up email link generation in notify flow"
```

---

### Task 7: Email Unsubscribe Endpoint

Add the token-based unsubscribe endpoint that works without authentication.

**Files:**
- Create: `packages/notifications/src/endpoints/email-unsubscribe.ts`
- Modify: `packages/notifications/src/procedures.ts`
- Modify: `packages/notifications/src/index.ts` (register endpoint)

**Step 1: Add the procedure definition**

In `procedures.ts`, add:

```ts
import { z } from 'zod';

// Add to ENDPOINTS object:
emailUnsubscribe: defineProcedure({
  path: '/notifications-plugin/email-unsubscribe',
  method: 'get',
  input: z.object({ token: z.string() }),
}).returns<void>(),
```

**Step 2: Create the endpoint**

```ts
// packages/notifications/src/endpoints/email-unsubscribe.ts
import { unsubscribe } from '@/api';
import { verifyUnsubscribeToken } from '@/email-token';
import { ENDPOINTS } from '@/procedures';

function htmlPage(title: string, message: string): Response {
  return new Response(
    `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f5f5f5;}
.card{background:#fff;border-radius:8px;padding:32px;max-width:400px;text-align:center;}</style>
</head><body><div class="card"><h2>${title}</h2><p>${message}</p></div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

export const emailUnsubscribeEndpoint = () =>
  ENDPOINTS.emailUnsubscribe.endpoint(async (req, { token }) => {
    const payload = verifyUnsubscribeToken(req.payload.config.secret, token);

    if (!payload) {
      return htmlPage(
        'Invalid link',
        'This unsubscribe link is invalid or has been tampered with.',
      );
    }

    try {
      await unsubscribe(req, payload.userId, payload.documentReference);
    } catch {
      // Already unsubscribed or subscription didn't exist — that's fine
    }

    return htmlPage(
      'Unsubscribed',
      'You have been unsubscribed from these notifications.',
    );
  });
```

**Step 3: Register the endpoint in `index.ts`**

Add the import and push to endpoints array:

```ts
import { emailUnsubscribeEndpoint } from './endpoints/email-unsubscribe';

// In the endpoints push:
config.endpoints.push(
  // ... existing endpoints
  emailUnsubscribeEndpoint(),
);
```

**Step 4: Run type check**

Run: `cd packages/notifications && pnpm check:types`
Expected: PASS.

**Step 5: Commit**

```bash
git add packages/notifications/src/endpoints/email-unsubscribe.ts \
       packages/notifications/src/procedures.ts \
       packages/notifications/src/index.ts
git commit -m "feat(payload-notifications): add token-based email unsubscribe endpoint"
```

---

### Task 8: Update Open-Notification Endpoint — Login Redirect

Change the 401 response to redirect unauthenticated users to the login page.

**Files:**
- Modify: `packages/notifications/src/endpoints/open-notification.ts`

**Step 1: Update the auth check**

Replace the 401 block:

```ts
// Before:
if (!req.user) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

// After:
if (!req.user) {
  const loginURL = getAdminURL({ req, path: '/login' });
  const apiRoute = req.payload.config.routes.api;
  const currentPath = `${apiRoute}/notifications-plugin/open?id=${id}`;
  return Response.redirect(
    `${loginURL}?redirect=${encodeURIComponent(currentPath)}`,
    302,
  );
}
```

Note: `getAdminURL` is already imported in this file.

**Step 2: Run type check**

Run: `cd packages/notifications && pnpm check:types`
Expected: PASS.

**Step 3: Commit**

```bash
git add packages/notifications/src/endpoints/open-notification.ts
git commit -m "feat(payload-notifications): redirect to login instead of 401 on open endpoint"
```

---

### Task 9: Run Full Test Suite & Final Verification

**Step 1: Run all tests**

Run: `cd packages/notifications && pnpm test`
Expected: All tests PASS (existing + new).

**Step 2: Run type check**

Run: `cd packages/notifications && pnpm check:types`
Expected: PASS.

**Step 3: Run lint**

Run: `cd packages/notifications && pnpm lint`
Expected: PASS (or only pre-existing warnings).

**Step 4: Build**

Run: `cd packages/notifications && pnpm build`
Expected: PASS.

**Step 5: If any failures, fix and re-run before committing.**

---

### Task 10: Final Commit & Cleanup

**Step 1: Verify git status is clean or only has expected changes**

Run: `git status`

**Step 2: If there are remaining unstaged fixes from Task 9, commit them**

```bash
git add -A packages/notifications/
git commit -m "chore(payload-notifications): fix lint/type issues from email feature"
```
