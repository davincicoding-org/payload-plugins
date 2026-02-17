# notify() API Rework — Design

## Problem

The current `notify()` API has three issues:

1. **Subject is a static string** — actor display names and document titles baked
   in at write time go stale when the underlying data changes.
2. **Consumer constructs admin URLs manually** — brittle, couples callers to
   Payload's internal routing, and duplicates URL-building logic.
3. **Actor display name is not resolved** — the consumer must look up the actor's
   name themselves instead of the plugin deriving it from the user collection's
   `admin.useAsTitle`.

## Design

### Subject — Three Tiers

Consumers choose the level of dynamism they need:

**Plain string** — stored as-is, no resolution:

```ts
subject: 'Welcome to the platform'
```

**Function (SubjectFn)** — resolved at write time, stored as a string:

```ts
subject: ({ actor, document }) =>
  `${actor.displayName} commented on "${document.title}"`
```

**Live subject** — stored as JSON tokens, resolved at read time:

```ts
import { createLiveSubject } from 'payload-notifications';

subject: createLiveSubject(t =>
  t`${t.actor} commented on "${t.document('title')}"`
)
```

#### Type Definitions

```ts
type SubjectFn = (context: SubjectContext) => string;

interface SubjectContext {
  actor: { id: string | number; displayName: string };
  document?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}
```

#### Storage Format

The `subject` field on the Notifications entity changes from `text` to `json`:

| Input form          | Stored value                              | Read-time cost |
| ------------------- | ----------------------------------------- | -------------- |
| `string`            | `{ type: 'static', value: '...' }`        | None           |
| `SubjectFn`         | `{ type: 'static', value: '...' }`        | None           |
| `createLiveSubject` | `{ type: 'dynamic', parts: [...tokens] }` | DB lookups     |

#### Actor Display Name Resolution

The plugin resolves the actor's display name from the user collection's
`admin.useAsTitle` config — the same pattern used by the discussions plugin in
`packages/discussions/src/utils.ts`.

### URL — Redirect Endpoint

Replace direct URL navigation with a server endpoint that marks the notification
as read and redirects to the correct destination.

**New endpoint:** `GET /api/notifications/:id/open`

1. Verify the requesting user owns the notification.
2. Set `readAt` to the current timestamp.
3. Determine the redirect target:
   - If `url` is set on the notification, redirect there.
   - Else if `documentReference` is set, derive the admin URL
     (`{adminRoute}/collections/{slug}/{id}` or `{adminRoute}/globals/{slug}`).
   - Else redirect to admin root.
4. Respond with `302`.

Both the in-app notification list and email links use this same endpoint, giving
consistent mark-as-read + navigation behavior across channels.

When both `url` and `documentReference` are present, `url` wins for navigation.
`documentReference` is still used for unsubscribe functionality.

### NotifyInput — Final Shape

```ts
interface NotifyInput {
  recipient: TypeWithID['id'];
  event: string;
  actor?: TypeWithID['id'];
  subject: string | SubjectFn | LiveSubject;
  documentReference?: DocumentReference;
  url?: string;
  meta?: Record<string, unknown>;
}
```

- `actor` — optional; system notifications have no human actor.
- `documentReference` — optional; used internally by the plugin for URL
  derivation and unsubscribe. Stored on the notification entity.
- `url` — optional; explicit override for non-document destinations.
- `subscription` — removed from the public input; the plugin links notifications
  to subscriptions internally using `documentReference`.

### Entity Changes

**Notifications collection:**

- `subject`: `text` -> `json` (stores `{ type, value | parts }`).
- `url`: kept as `text` (stores explicit override).
- Add `documentReference` group field (same shape as the subscriptions entity).
- Remove `documentId` text field (replaced by `documentReference.documentId`).

**New endpoint:**

- `GET /api/notifications/:id/open` — mark as read and redirect.

### Client Changes

- `NotificationItem` click navigates to `/api/notifications/:id/open` instead of
  calling `router.push(url)`.
- Email templates link to the same endpoint.
- A `resolveSubject()` utility renders live subjects at read time when fetching
  the notification list.

### Consumer Call Site (Discussions Example)

```ts
await notify(req, {
  recipient: recipientId,
  event: parentComment ? 'reply.created' : 'comment.created',
  actor: authorId,
  subject: ({ actor }) => parentComment
    ? `${actor.displayName} replied to a comment`
    : `${actor.displayName} commented on a document`,
  documentReference,
});
```

No URL construction. No subscription wiring.

### What Does Not Change

- `subscribe()`, `unsubscribe()`, `getSubscribers()` APIs.
- Plugin config shape (`notificationsPlugin({ ... })`).
- `NotificationEmailConfig` callbacks receive the resolved subject string.
- `onNotify` callback receives the resolved subject string.
