# Notifications System Design

Two-plugin architecture for email, in-app, and external notifications
triggered by discussion activity.

## 1. Plugin Boundary

### `payload-notifications` (new plugin)

Generic notification infrastructure. Knows nothing about discussions,
comments, or threads. Owns:

- Notifications collection (storage + delivery tracking)
- Subscriptions collection (document-level watch/unwatch)
- User notification preferences (fields added to users collection)
- Delivery channels (email, in-app, external callbacks)
- Admin UI (bell icon, notification drawer, full notifications view)
- Programmatic API for other plugins/consumers

### `payload-discussions` (existing plugin, extended)

Remains the event source. Extended with a single `onComment` callback
in its plugin options. Knows nothing about notifications infrastructure.

### Source code decoupling

The two plugins never import each other. The consumer wires them
together in `payload.config.ts` using the notifications API handle.

## 2. Integration Pattern

The notifications plugin uses a factory that returns both the Payload
plugin and a programmatic API handle:

```ts
import { createNotifications } from 'payload-notifications'
import { discussionsPlugin } from 'payload-discussions'

const notifications = createNotifications({
  email: {
    generateHTML: ({ notification, recipient }) => '...',
    generateSubject: ({ notification, recipient }) => '...',
  },
  onNotify: async ({ req, notification, recipient }) => {
    // external channel: Slack, Discord, webhooks, etc.
  },
})

export default buildConfig({
  plugins: [
    notifications.plugin(),
    discussionsPlugin({
      collections: ['feature-requests'],
      onComment: async ({ req, comment, parentComment, rootComment, documentId, collectionSlug }) => {
        const { notify, subscribe, getSubscribers } = notifications

        // Auto-subscribe the commenter
        await subscribe(req, comment.author, documentId, collectionSlug, 'auto')

        // Resolve recipients based on comment type
        const subscribers = await getSubscribers(req, documentId, collectionSlug)

        if (parentComment) {
          // Reply — notify parent author, thread participants, subscribers
          const parentAuthorId = parentComment.author
          // ... build recipient set, deduplicate, exclude self
          // ... call notify() for each recipient with appropriate event type
        } else {
          // Top-level comment — notify document author, subscribers
          // ... resolve document author via req.payload.findByID()
          // ... build recipient set, deduplicate, exclude self
          // ... call notify() for each recipient
        }
      },
    }),
  ],
})
```

## 3. Discussions Plugin — Callback Interface

Single callback added to plugin options:

```ts
interface DiscussionsPluginOptions {
  collections?: CollectionSlug[]
  globals?: GlobalSlug[]
  maxCommentDepth?: number
  collectionSlug?: CollectionSlug
  onComment?: (args: OnCommentArgs) => void | Promise<void>
}

interface OnCommentArgs {
  req: PayloadRequest
  comment: Comment
  parentComment?: Comment   // present if reply
  rootComment?: Comment     // present if reply (top-level thread comment)
  documentId: string
  collectionSlug: string
}
```

If `onComment` is not provided, the plugin works exactly as it does
today — no notifications, no errors.

## 4. Notifications Plugin — Data Model

### `notifications` collection (hidden)

| Field       | Type                     | Description                                |
| ----------- | ------------------------ | ------------------------------------------ |
| `recipient` | `relationship → users`   | Who this notification is for               |
| `event`     | `text`                   | Arbitrary event key                        |
| `actor`     | `group`                  | `{ id: relationship → users, displayName: text }` |
| `subject`   | `text`                   | Human-readable summary                     |
| `url`       | `text, optional`         | Deep link to relevant document             |
| `meta`      | `json, optional`         | Arbitrary data for templates               |
| `readAt`    | `date, optional`         | null = unread, timestamp = read            |
| `channels`  | `group`                  | `{ email: { sentAt?, error? }, inApp: { deliveredAt? } }` |

One row per recipient per event. Self-notifications are never created.

### `subscriptions` collection (hidden)

| Field            | Type                   | Description                          |
| ---------------- | ---------------------- | ------------------------------------ |
| `user`           | `relationship → users` | Who is subscribed                    |
| `documentId`     | `text`                 | ID of the watched document           |
| `collectionSlug` | `text`                 | Collection the document belongs to   |
| `reason`         | `select`               | `"manual"` or `"auto"`              |

Unique constraint: `(user, documentId, collectionSlug)`.

### User preferences (fields added to `users` collection)

| Field              | Type       | Default | Description                  |
| ------------------ | ---------- | ------- | ---------------------------- |
| `email.enabled`    | `checkbox` | `true`  | Receive email notifications  |
| `inApp.enabled`    | `checkbox` | `true`  | Receive in-app notifications |

Global on/off per channel. No per-event-type routing.

## 5. Notifications Plugin — Programmatic API

```ts
const notifications = createNotifications({ ... })

// Returns the Payload plugin for the plugins array
notifications.plugin()

// Create and deliver a notification
notifications.notify(req, {
  recipient: string           // user ID
  event: string               // e.g. "comment.created"
  actor: { id: string, displayName: string }
  subject: string             // human-readable summary
  url?: string                // deep link
  meta?: Record<string, unknown>
})

// Subscription management
notifications.subscribe(req, userId, documentId, collectionSlug, reason?)
notifications.unsubscribe(req, userId, documentId, collectionSlug)
notifications.getSubscribers(req, documentId, collectionSlug) → string[]
```

All API methods take `req` as first argument to access `req.payload`.

## 6. Delivery Channels

### Email

Uses Payload's built-in `req.payload.sendEmail`. Consumer provides
template functions at plugin creation:

```ts
createNotifications({
  email: {
    generateHTML: ({ notification, recipient }) => string | Promise<string>,
    generateSubject: ({ notification, recipient }) => string | Promise<string>,
  },
})
```

If `email` is not configured, email delivery is skipped. Respects the
user's `email.enabled` preference.

### In-app

Creating a notification row is the in-app notification. The plugin
provides UI components to surface them (see section 7).

Respects the user's `inApp.enabled` preference.

### External callbacks

Generic escape hatch for Slack, Discord, webhooks, or anything else:

```ts
createNotifications({
  onNotify: async ({ req, notification, recipient }) => {
    // consumer does whatever they want
  },
})
```

Fires for every notification. Consumer filters by event type or
recipient as needed.

### Delivery flow

```
notify() called
  → if inApp.enabled  → create notification row
  → if email config && email.enabled → send email
  → if onNotify configured → call onNotify callback
  (all channels fire in parallel, failures don't block each other)
  (email errors recorded in channels.email.error)
```

## 7. In-App UI

Built entirely on `@payloadcms/ui` primitives and Payload admin
injection points. No custom UI framework.

### Components

| Component              | Built with             | Injection point     |
| ---------------------- | ---------------------- | ------------------- |
| **Bell icon**          | `afterNavLinks` + Pill | Admin nav           |
| **Notification drawer** | Drawer                 | Opens from bell     |
| **Notification item**  | Custom (presentational)| Inside drawer       |
| **Toast on new**       | Toast (Sonner)         | Fires on poll       |
| **Full view**          | Custom view            | `/admin/notifications` |

### Bell icon

Injected via `afterNavLinks`. Pill component shows unread count.
Polls on interval (configurable, default 30s). Badge disappears at 0.

### Notification drawer

Drawer slides out from the right. Lists recent notifications in
reverse chronological order. Each item shows:

- Actor name + subject
- Relative timestamp (via `formatTimeToNow`)
- Unread indicator
- Click navigates to `url` and marks as read

Footer: "Mark all as read" and "View all" links.

### Toast

When polling detects new notifications during an active session,
fires a Sonner toast. Provides real-time feel without WebSockets.

### Watch/Unwatch button

Owned by the **discussions plugin**, not the notifications plugin.
A Button component in the discussions sidebar that calls the
notifications API (`subscribe` / `unsubscribe`) via the factory handle.

## 8. Recipient Resolution (Consumer Logic)

The discussions plugin's `onComment` callback resolves recipients.
This logic lives in `payload.config.ts`, not in either plugin.

### Event types

| Event              | Meaning                                    |
| ------------------ | ------------------------------------------ |
| `comment.created`  | New top-level comment on a document        |
| `reply.direct`     | Someone replied directly to your comment   |
| `reply.thread`     | Activity in a thread you participated in   |
| `comment.activity` | Activity on a document you're watching     |

### Top-level comment

1. Auto-subscribe commenter (reason: `"auto"`)
2. Resolve document author
3. Get all document subscribers
4. Recipients = (document author ∪ subscribers) − commenter
5. Deduplicate
6. Notify each with event `comment.created`

### Reply

1. Auto-subscribe replier (reason: `"auto"`)
2. Resolve parent comment author
3. Walk the thread (via `rootComment`) to collect all participant IDs
4. Get all document subscribers
5. Recipients = (parent author ∪ participants ∪ subscribers) − replier
6. Deduplicate
7. Notify each with appropriate event type:
   - Parent comment author → `reply.direct`
   - Other thread participants → `reply.thread`
   - Remaining subscribers → `comment.activity`

## 9. Defaults

| Behavior                       | Default                          |
| ------------------------------ | -------------------------------- |
| Commenting auto-subscribes     | Yes (reason: `"auto"`)          |
| Manual watch available         | Yes (button in discussions UI)   |
| Email notifications            | Enabled                          |
| In-app notifications           | Enabled                          |
| Self-notification              | Never                            |
| Poll interval                  | 30 seconds                       |
| Notification deduplication     | One notification per recipient per event |
