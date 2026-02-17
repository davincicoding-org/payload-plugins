# payload-notifications

Multi-channel notification infrastructure for Payload CMS with document subscriptions and live messages.

[![npm version](https://img.shields.io/npm/v/payload-notifications)](https://www.npmjs.com/package/payload-notifications)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Overview

Payload has no built-in way to notify users about events. This plugin provides a server-side `notify()` / `subscribe()` / `getSubscribers()` API that you wire into your own hooks, endpoints, and workflows. A single `notify()` call can store an in-app notification, send an email, and fire an external callback -- each channel independent and optional. Everything is user-scoped with strict access control.

**Features**

- **Multi-channel delivery** -- in-app, email, and external callbacks from a single `notify()` call. Per-user preferences control which channels are active.
- **Document subscriptions** -- users follow collections or globals. `getSubscribers()` returns follower IDs for fan-out. Supports auto-subscribe (e.g. on first comment) and manual follows.
- **Live messages** -- template tokens (`t.actor`, `t.document('title')`, `t.meta('key')`) that resolve against fresh data at read time. Renamed users and updated titles are reflected in existing notifications.
- **External callback** -- `onNotify` hook for pushing to Slack, webhooks, queues, or anything else.
- **Admin bell component** -- optional popover UI with unread badge, mark-read, unsubscribe, and delete actions.

## Installation

```sh
pnpm add payload-notifications
```

## Usage

```ts
// payload.config.ts
import { buildConfig } from "payload";
import { notificationsPlugin } from "payload-notifications";

export default buildConfig({
  // ...
  plugins: [
    notificationsPlugin({
      email: {
        generateSubject: ({ notification }) =>
          `Notification: ${notification.event}`,
        generateHTML: ({ notification, recipient }) =>
          `<p>Hi ${recipient.displayName}, ${notification.message}</p>`,
      },
    }),
  ],
});
```

### Sending notifications

```ts
import { notify } from "payload-notifications";

await notify(req, {
  recipient: user.id,
  event: "comment.created",
  actor: commenter.id,
  message: "Someone replied to your post",
  documentReference: { entity: "collection", slug: "posts", id: post.id },
});
```

### Subscriptions and fan-out

```ts
import {
  subscribe,
  getSubscribers,
  notify,
  createLiveMessage,
} from "payload-notifications";

const docRef = { entity: "collection", slug: "posts", id: post.id } as const;

await subscribe(req, { userId: commenter.id, documentReference: docRef });

const subscribers = await getSubscribers(req, docRef);
for (const recipientId of subscribers) {
  await notify(req, {
    recipient: recipientId,
    event: "comment.created",
    actor: commenter.id,
    message: createLiveMessage(
      (t) => t`${t.actor} commented on "${t.document("title")}"`,
    ),
    documentReference: docRef,
  });
}
```

### Live messages

Static strings go stale when users rename themselves or documents get updated. Live messages store tokens that resolve against fresh data at read time:

```ts
import { notify, createLiveMessage } from "payload-notifications";

await notify(req, {
  recipient: user.id,
  event: "post.updated",
  actor: editor.id,
  message: createLiveMessage(
    (t) => t`${t.actor} edited "${t.document("title")}"`,
  ),
  documentReference: { entity: "collection", slug: "posts", id: post.id },
});
```

- `t.actor` -- actor's display name (from `admin.useAsTitle` on the user collection)
- `t.document(field)` -- a field from the referenced document
- `t.meta(key)` -- a key from the notification's `meta` object

### Options

| Option              | Type                      | Default           | Description                                                         |
| ------------------- | ------------------------- | ----------------- | ------------------------------------------------------------------- |
| `email`             | `NotificationEmailConfig` | --                | `generateSubject` and `generateHTML` functions. Omit to skip email. |
| `onNotify`          | `NotifactionCallback`     | --                | Callback for every notification (Slack, webhooks, queues, etc).     |
| `notificationsSlug` | `string`                  | `"notifications"` | Slug for the notifications collection.                              |
| `subscriptionsSlug` | `string`                  | `"subscriptions"` | Slug for the subscriptions collection.                              |
| `pollInterval`      | `number`                  | `30`              | Poll interval in seconds for the admin bell component.              |

### API

All functions are server-side and require a `PayloadRequest`:

| Export                          | Description                                                    |
| ------------------------------- | -------------------------------------------------------------- |
| `notify(req, input)`            | Deliver a notification. Respects per-user channel preferences. |
| `subscribe(req, opts)`          | Subscribe a user to a document. Deduplicates automatically.    |
| `unsubscribe(req, userId, ref)` | Remove a subscription.                                         |
| `getSubscribers(req, ref)`      | Return all user IDs subscribed to a document.                  |
| `createLiveMessage(fn)`         | Build a serializable message template with dynamic tokens.     |

## Contributing

This plugin lives in the [payload-plugins](https://github.com/davincicoding-org/payload-plugins) monorepo.

### Development

```sh
pnpm install

# watch this plugin for changes
pnpm --filter payload-notifications dev

# run the Payload dev app (in a second terminal)
pnpm --filter sandbox dev
```

The `sandbox/` directory is a Next.js + Payload app that imports plugins via `workspace:*` -- use it to test changes locally.

### Code quality

- **Formatting & linting** -- handled by [Biome](https://biomejs.dev/), enforced on commit via husky + lint-staged.
- **Commits** -- must follow [Conventional Commits](https://www.conventionalcommits.org/) with a valid scope (e.g. `fix(payload-notifications): ...`).
- **Changesets** -- please include a [changeset](https://github.com/changesets/changesets) in your PR by running `pnpm release`.

### Issues & PRs

Bug reports and feature requests are welcome -- [open an issue](https://github.com/davincicoding-org/payload-plugins/issues).

## License

MIT
