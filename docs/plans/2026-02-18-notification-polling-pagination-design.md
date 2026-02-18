# Notification Polling & Pagination

## Problem

The notification bell currently polls only a count, then fetches the full
list (unread + read, mixed together, capped at 20) when the popover opens.
This causes a stale-then-refresh flash on open and provides no way to browse
older notifications.

## Goals

1. Poll unread notifications directly so the popover is always ready.
2. Show read notifications on demand with paginated "Show older" loading.
3. Keep the polling payload small in the common case (no new notifications).

## Endpoint Design

### `GET /notifications-plugin/unread`

Replaces both `listNotifications` and `unreadCount`.

| Param   | Type           | Required | Purpose                                 |
|---------|----------------|----------|-----------------------------------------|
| `since` | ISO timestamp  | No       | Only return notifications created after |

**Response (always the same shape):**

```json
{
  "docs": [],
  "timestamp": "2026-02-18T12:00:00.000Z"
}
```

- `docs`: new unread notifications since `since` (or all unread on initial
  load when `since` is omitted).
- `timestamp`: server time, used as `since` for the next poll.

When there are no new notifications, `docs` is an empty array. When there
are new ones, they are included inline. No separate count field — the client
derives the badge count from `unread.length`.

### `GET /notifications-plugin/read`

New endpoint. Fetched on demand, not polled.

| Param   | Type   | Required | Default | Purpose         |
|---------|--------|----------|---------|-----------------|
| `page`  | number | No       | 1       | Page number     |
| `limit` | number | No       | 10      | Items per page  |

**Response:**

```json
{
  "docs": [],
  "hasNextPage": false,
  "totalDocs": 42
}
```

### Removed Endpoints

- `GET /notifications-plugin/list` — replaced by `/unread` and `/read`.
- `GET /notifications-plugin/unread-count` — badge uses `unread.length`.

The plugin is unreleased, so no deprecation path is needed.

## Client-Side Architecture

### State: `useReducer`

A single reducer at the top of `NotificationBell` owns all notification
state. No context or external state library needed — the component tree is
self-contained.

```
State {
  unread:         NotificationData[]
  read:           NotificationData[]
  readPage:       number
  hasMoreRead:    boolean
  isReadLoaded:   boolean
  pollTimestamp:   string | null
}
```

**Actions:**

| Action               | Effect                                           |
|----------------------|--------------------------------------------------|
| `SET_UNREAD`         | Replace unread list (initial load)               |
| `PREPEND_UNREAD`     | Prepend new docs to unread (poll result)          |
| `APPEND_READ`        | Append docs to read list, update hasMoreRead      |
| `MARK_READ`          | Remove from unread; prepend to read if loaded     |
| `MARK_ALL_READ`      | Clear unread; reset read list                     |
| `DELETE_NOTIFICATION`| Remove from whichever list contains the item      |
| `SET_POLL_TIMESTAMP` | Update timestamp for next poll                    |

### Hooks

Three thin hooks that handle fetching and delegate state to the reducer:

**`useUnreadNotifications(apiRoute, pollInterval, dispatch)`**

- On mount: `GET /unread` (no `since`), dispatches `SET_UNREAD`.
- On interval: `GET /unread?since=<timestamp>`, dispatches `PREPEND_UNREAD`
  if docs are returned.
- Pauses polling when the tab is hidden (visibility API), resumes with an
  immediate fetch when the tab returns.

**`useReadNotifications(apiRoute, state, dispatch)`**

- Exposes `loadMore()` which calls `GET /read?page=<next>&limit=10` and
  dispatches `APPEND_READ`.
- Not polled. Triggered by "Show older" button.

**`useNotificationActions(apiRoute, dispatch)`**

- `markRead(id)`: `POST /mark-read`, dispatches `MARK_READ`.
- `markAllRead()`: `POST /mark-all-read`, dispatches `MARK_ALL_READ`.
- `deleteNotification(id)`: `POST /delete`, dispatches `DELETE_NOTIFICATION`.

All mutations are optimistic — the store updates immediately, the API call
fires in the background.

### `markRead` Behavior

When a notification is marked as read:

- Always removed from `unread`.
- If the read list is already loaded (`isReadLoaded` is true), prepend to
  `read` so the item stays visible.
- If the read list is not loaded, the item simply disappears. The user can
  find it via "Show older" later.

## UI Layout

```
┌─────────────────────────┐
│ Notifications      [settings icon]  │
├─────────────────────────┤
│ [unread item]           │
│ [unread item]           │
│ [unread item]           │
│                         │
│ ── Show older ────────  │  ← loads first page of read
│                         │
│ [read item]             │
│ [read item]             │
│ ...                     │
│ [Show more]             │  ← next page, hidden when !hasNextPage
└─────────────────────────┘
```

- The popover no longer fetches on open. Unread notifications are already
  in state from polling.
- "Show older" appears below the unread list. Clicking it loads the first
  page of read notifications.
- "Show more" appears at the bottom of the read list when `hasNextPage`
  is true.
- When there are no unread and no read loaded: "No notifications".
