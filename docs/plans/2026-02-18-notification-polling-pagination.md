# Notification Polling & Pagination — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the count-only polling + on-open fetch with direct unread polling and paginated read notifications.

**Architecture:** Two new server endpoints (`/unread` with `since`-based polling, `/read` with pagination) replace the old `/list` and `/unread-count`. Client state moves from scattered `useState` hooks to a single `useReducer` with three thin fetching hooks.

**Tech Stack:** Payload CMS, React, Zod, `@repo/common` procedure framework.

**Design doc:** `docs/plans/2026-02-18-notification-polling-pagination-design.md`

---

### Task 1: Add endpoint procedure definitions

Replace `listNotifications` and `unreadCount` in the ENDPOINTS object with
`unread` and `read` procedures.

**Files:**
- Modify: `packages/notifications/src/procedures.ts`

**Step 1: Update the ENDPOINTS object**

Replace the `listNotifications` and `unreadCount` entries with:

```ts
unread: defineProcedure({
  path: '/notifications-plugin/unread',
  method: 'get',
  input: z.object({ since: z.string().optional() }),
}).returns<{ docs: NotificationData[]; timestamp: string }>(),

read: defineProcedure({
  path: '/notifications-plugin/read',
  method: 'get',
  input: z.object({
    page: z.coerce.number().optional().default(1),
    limit: z.coerce.number().optional().default(10),
  }),
}).returns<{ docs: NotificationData[]; hasNextPage: boolean; totalDocs: number }>(),
```

Note: `z.coerce.number()` is needed because GET query params arrive as
strings from `URLSearchParams`.

**Step 2: Verify types compile**

Run: `cd packages/notifications && pnpm check:types`
Expected: PASS (no type errors)

**Step 3: Commit**

```bash
git add packages/notifications/src/procedures.ts
git commit -m "refactor(payload-notifications): replace list/unreadCount with unread/read procedures"
```

---

### Task 2: Create the unread notifications endpoint

Handles both initial load (no `since`) and poll (with `since`).

**Files:**
- Create: `packages/notifications/src/endpoints/unread-notifications.ts`
- Delete: `packages/notifications/src/endpoints/list-notifications.ts`
- Delete: `packages/notifications/src/endpoints/unread-count.ts`

**Step 1: Create the endpoint**

```ts
import type { CollectionSlug } from 'payload';
import { resolveMessageAtReadTime } from '@/message';
import type { Notification } from '@/payload-types';
import { ENDPOINTS } from '@/procedures';
import type { NotificationData } from '@/types';

export const unreadNotificationsEndpoint = (
  notificationsSlug: CollectionSlug,
) =>
  ENDPOINTS.unread.endpoint(async (req, { since }) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const timestamp = new Date().toISOString();

    const where: Record<string, unknown> = {
      and: [
        { recipient: { equals: req.user.id } },
        { readAt: { exists: false } },
        ...(since ? [{ createdAt: { greater_than: since } }] : []),
      ],
    };

    const result = await req.payload.find({
      collection: notificationsSlug as 'notifications',
      where,
      sort: '-createdAt',
      limit: 0, // no limit — return all unread
      depth: 0,
    });

    const docs: NotificationData[] = result.docs.map((doc) => ({
      id: doc.id,
      event: doc.event,
      message: resolveMessage(doc),
      readAt: doc.readAt,
      documentReference: {
        entity: doc.documentReference?.entity ?? 'collection',
        slug: doc.documentReference?.slug ?? '',
        documentId: doc.documentReference?.documentId ?? undefined,
      },
      createdAt: doc.createdAt,
    }));

    return { docs, timestamp };
  });

function resolveMessage(doc: Notification): string {
  return resolveMessageAtReadTime(doc.message, {
    meta: doc.meta as Record<string, unknown> | undefined,
  });
}
```

Note: `limit: 0` in Payload means "return all documents". This is
intentional — we return all unread notifications without a cap.

**Step 2: Delete old files**

Delete `packages/notifications/src/endpoints/list-notifications.ts` and
`packages/notifications/src/endpoints/unread-count.ts`.

**Step 3: Verify types compile**

Run: `cd packages/notifications && pnpm check:types`
Expected: Will FAIL — `index.ts` still imports the deleted endpoints. That's
fixed in Task 4.

**Step 4: Commit**

```bash
git add -A packages/notifications/src/endpoints/
git commit -m "feat(payload-notifications): add unread notifications endpoint with since-based polling"
```

---

### Task 3: Create the read notifications endpoint

Paginated endpoint for on-demand loading of read notifications.

**Files:**
- Create: `packages/notifications/src/endpoints/read-notifications.ts`

**Step 1: Create the endpoint**

```ts
import type { CollectionSlug } from 'payload';
import { resolveMessageAtReadTime } from '@/message';
import type { Notification } from '@/payload-types';
import { ENDPOINTS } from '@/procedures';
import type { NotificationData } from '@/types';

export const readNotificationsEndpoint = (
  notificationsSlug: CollectionSlug,
) =>
  ENDPOINTS.read.endpoint(async (req, { page, limit }) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await req.payload.find({
      collection: notificationsSlug as 'notifications',
      where: {
        and: [
          { recipient: { equals: req.user.id } },
          { readAt: { exists: true } },
        ],
      },
      sort: '-readAt',
      page,
      limit,
      depth: 0,
    });

    const docs: NotificationData[] = result.docs.map((doc) => ({
      id: doc.id,
      event: doc.event,
      message: resolveMessage(doc),
      readAt: doc.readAt,
      documentReference: {
        entity: doc.documentReference?.entity ?? 'collection',
        slug: doc.documentReference?.slug ?? '',
        documentId: doc.documentReference?.documentId ?? undefined,
      },
      createdAt: doc.createdAt,
    }));

    return {
      docs,
      hasNextPage: result.hasNextPage,
      totalDocs: result.totalDocs,
    };
  });

function resolveMessage(doc: Notification): string {
  return resolveMessageAtReadTime(doc.message, {
    meta: doc.meta as Record<string, unknown> | undefined,
  });
}
```

**Step 2: Verify types compile**

Run: `cd packages/notifications && pnpm check:types`
Expected: Will still fail due to `index.ts` imports. Fixed next.

**Step 3: Commit**

```bash
git add packages/notifications/src/endpoints/read-notifications.ts
git commit -m "feat(payload-notifications): add paginated read notifications endpoint"
```

---

### Task 4: Wire up new endpoints in plugin config

Update `index.ts` to import and register the new endpoints, remove the old
ones.

**Files:**
- Modify: `packages/notifications/src/index.ts`

**Step 1: Update imports**

Replace:
```ts
import { listNotificationsEndpoint } from './endpoints/list-notifications';
import { unreadCountEndpoint } from './endpoints/unread-count';
```

With:
```ts
import { unreadNotificationsEndpoint } from './endpoints/unread-notifications';
import { readNotificationsEndpoint } from './endpoints/read-notifications';
```

**Step 2: Update endpoint registration**

In the `config.endpoints.push(...)` call, replace:
```ts
listNotificationsEndpoint(notifSlug),
unreadCountEndpoint(notifSlug),
```

With:
```ts
unreadNotificationsEndpoint(notifSlug),
readNotificationsEndpoint(notifSlug),
```

**Step 3: Verify types compile**

Run: `cd packages/notifications && pnpm check:types`
Expected: PASS

**Step 4: Run existing tests**

Run: `cd packages/notifications && pnpm test`
Expected: PASS (existing tests only check plugin function shape)

**Step 5: Commit**

```bash
git add packages/notifications/src/index.ts
git commit -m "refactor(payload-notifications): wire up unread/read endpoints, remove old list/unreadCount"
```

---

### Task 5: Extract shared doc-to-NotificationData mapper

Both new endpoints duplicate the `doc → NotificationData` mapping. Extract
it into a shared helper.

**Files:**
- Create: `packages/notifications/src/endpoints/map-notification.ts`
- Modify: `packages/notifications/src/endpoints/unread-notifications.ts`
- Modify: `packages/notifications/src/endpoints/read-notifications.ts`

**Step 1: Create the shared mapper**

```ts
import { resolveMessageAtReadTime } from '@/message';
import type { Notification } from '@/payload-types';
import type { NotificationData } from '@/types';

/** Maps a Notification document to the client-facing NotificationData shape. */
export function mapNotification(doc: Notification): NotificationData {
  return {
    id: doc.id,
    event: doc.event,
    message: resolveMessageAtReadTime(doc.message, {
      meta: doc.meta as Record<string, unknown> | undefined,
    }),
    readAt: doc.readAt,
    documentReference: {
      entity: doc.documentReference?.entity ?? 'collection',
      slug: doc.documentReference?.slug ?? '',
      documentId: doc.documentReference?.documentId ?? undefined,
    },
    createdAt: doc.createdAt,
  };
}
```

**Step 2: Update both endpoints**

In both `unread-notifications.ts` and `read-notifications.ts`:
- Remove the local `resolveMessage` function
- Remove the `import { resolveMessageAtReadTime }` import
- Add `import { mapNotification } from './map-notification';`
- Replace `result.docs.map((doc) => ({ ... }))` with
  `result.docs.map(mapNotification)`

**Step 3: Verify types compile**

Run: `cd packages/notifications && pnpm check:types`
Expected: PASS

**Step 4: Commit**

```bash
git add packages/notifications/src/endpoints/
git commit -m "refactor(payload-notifications): extract shared mapNotification helper"
```

---

### Task 6: Create the notification reducer

Central state management for the NotificationBell component.

**Files:**
- Create: `packages/notifications/src/components/notification-reducer.ts`

**Step 1: Create the reducer**

```ts
import type { NotificationData } from '@/types';

export interface NotificationState {
  unread: NotificationData[];
  read: NotificationData[];
  readPage: number;
  hasMoreRead: boolean;
  isReadLoaded: boolean;
  pollTimestamp: string | null;
}

export const INITIAL_STATE: NotificationState = {
  unread: [],
  read: [],
  readPage: 0,
  hasMoreRead: true,
  isReadLoaded: false,
  pollTimestamp: null,
};

export type NotificationAction =
  | { type: 'SET_UNREAD'; docs: NotificationData[]; timestamp: string }
  | { type: 'PREPEND_UNREAD'; docs: NotificationData[]; timestamp: string }
  | {
      type: 'APPEND_READ';
      docs: NotificationData[];
      hasNextPage: boolean;
    }
  | { type: 'MARK_READ'; id: string | number }
  | { type: 'MARK_ALL_READ' }
  | { type: 'DELETE_NOTIFICATION'; id: string | number };

export function notificationReducer(
  state: NotificationState,
  action: NotificationAction,
): NotificationState {
  switch (action.type) {
    case 'SET_UNREAD':
      return {
        ...state,
        unread: action.docs,
        pollTimestamp: action.timestamp,
      };

    case 'PREPEND_UNREAD':
      return {
        ...state,
        unread:
          action.docs.length > 0
            ? [...action.docs, ...state.unread]
            : state.unread,
        pollTimestamp: action.timestamp,
      };

    case 'APPEND_READ':
      return {
        ...state,
        read: [...state.read, ...action.docs],
        readPage: state.readPage + 1,
        hasMoreRead: action.hasNextPage,
        isReadLoaded: true,
      };

    case 'MARK_READ': {
      const item = state.unread.find((n) => n.id === action.id);
      return {
        ...state,
        unread: state.unread.filter((n) => n.id !== action.id),
        read:
          state.isReadLoaded && item
            ? [{ ...item, readAt: new Date().toISOString() }, ...state.read]
            : state.read,
      };
    }

    case 'MARK_ALL_READ':
      return {
        ...state,
        unread: [],
        read: [],
        readPage: 0,
        hasMoreRead: true,
        isReadLoaded: false,
      };

    case 'DELETE_NOTIFICATION':
      return {
        ...state,
        unread: state.unread.filter((n) => n.id !== action.id),
        read: state.read.filter((n) => n.id !== action.id),
      };
  }
}
```

**Step 2: Verify types compile**

Run: `cd packages/notifications && pnpm check:types`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/notifications/src/components/notification-reducer.ts
git commit -m "feat(payload-notifications): add notification state reducer"
```

---

### Task 7: Write reducer unit tests

Test the reducer logic in isolation before wiring it into the component.

**Files:**
- Create: `packages/notifications/src/components/notification-reducer.test.ts`

**Step 1: Write tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  INITIAL_STATE,
  notificationReducer,
  type NotificationState,
} from './notification-reducer';
import type { NotificationData } from '@/types';

const makeNotification = (
  overrides: Partial<NotificationData> = {},
): NotificationData => ({
  id: overrides.id ?? '1',
  event: 'test',
  message: 'Test notification',
  readAt: overrides.readAt ?? null,
  documentReference: { entity: 'collection', slug: 'posts' },
  createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
});

describe('notificationReducer', () => {
  describe('SET_UNREAD', () => {
    it('should replace unread list and set timestamp', () => {
      const docs = [makeNotification({ id: '1' })];
      const result = notificationReducer(INITIAL_STATE, {
        type: 'SET_UNREAD',
        docs,
        timestamp: '2026-01-01T00:00:00.000Z',
      });
      expect(result.unread).toEqual(docs);
      expect(result.pollTimestamp).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('PREPEND_UNREAD', () => {
    it('should prepend new docs to existing unread', () => {
      const existing = makeNotification({ id: '1' });
      const newDoc = makeNotification({ id: '2' });
      const state: NotificationState = {
        ...INITIAL_STATE,
        unread: [existing],
        pollTimestamp: '2026-01-01T00:00:00.000Z',
      };
      const result = notificationReducer(state, {
        type: 'PREPEND_UNREAD',
        docs: [newDoc],
        timestamp: '2026-01-01T00:01:00.000Z',
      });
      expect(result.unread).toEqual([newDoc, existing]);
      expect(result.pollTimestamp).toBe('2026-01-01T00:01:00.000Z');
    });

    it('should not create new array reference when docs is empty', () => {
      const state: NotificationState = {
        ...INITIAL_STATE,
        unread: [makeNotification()],
      };
      const result = notificationReducer(state, {
        type: 'PREPEND_UNREAD',
        docs: [],
        timestamp: '2026-01-01T00:01:00.000Z',
      });
      expect(result.unread).toBe(state.unread);
    });
  });

  describe('APPEND_READ', () => {
    it('should append docs and update pagination state', () => {
      const docs = [makeNotification({ id: '1', readAt: '2026-01-01T00:00:00.000Z' })];
      const result = notificationReducer(INITIAL_STATE, {
        type: 'APPEND_READ',
        docs,
        hasNextPage: true,
      });
      expect(result.read).toEqual(docs);
      expect(result.readPage).toBe(1);
      expect(result.hasMoreRead).toBe(true);
      expect(result.isReadLoaded).toBe(true);
    });
  });

  describe('MARK_READ', () => {
    it('should remove from unread', () => {
      const state: NotificationState = {
        ...INITIAL_STATE,
        unread: [makeNotification({ id: '1' }), makeNotification({ id: '2' })],
      };
      const result = notificationReducer(state, {
        type: 'MARK_READ',
        id: '1',
      });
      expect(result.unread).toHaveLength(1);
      expect(result.unread[0].id).toBe('2');
    });

    it('should prepend to read list when read is loaded', () => {
      const state: NotificationState = {
        ...INITIAL_STATE,
        unread: [makeNotification({ id: '1' })],
        isReadLoaded: true,
        read: [makeNotification({ id: '2', readAt: '2026-01-01T00:00:00.000Z' })],
      };
      const result = notificationReducer(state, {
        type: 'MARK_READ',
        id: '1',
      });
      expect(result.unread).toHaveLength(0);
      expect(result.read).toHaveLength(2);
      expect(result.read[0].id).toBe('1');
      expect(result.read[0].readAt).toBeTruthy();
    });

    it('should not add to read list when read is not loaded', () => {
      const state: NotificationState = {
        ...INITIAL_STATE,
        unread: [makeNotification({ id: '1' })],
        isReadLoaded: false,
      };
      const result = notificationReducer(state, {
        type: 'MARK_READ',
        id: '1',
      });
      expect(result.unread).toHaveLength(0);
      expect(result.read).toHaveLength(0);
    });
  });

  describe('MARK_ALL_READ', () => {
    it('should clear unread and reset read list state', () => {
      const state: NotificationState = {
        ...INITIAL_STATE,
        unread: [makeNotification({ id: '1' })],
        read: [makeNotification({ id: '2', readAt: '2026-01-01T00:00:00.000Z' })],
        readPage: 2,
        hasMoreRead: false,
        isReadLoaded: true,
      };
      const result = notificationReducer(state, { type: 'MARK_ALL_READ' });
      expect(result.unread).toHaveLength(0);
      expect(result.read).toHaveLength(0);
      expect(result.readPage).toBe(0);
      expect(result.hasMoreRead).toBe(true);
      expect(result.isReadLoaded).toBe(false);
    });
  });

  describe('DELETE_NOTIFICATION', () => {
    it('should remove from unread', () => {
      const state: NotificationState = {
        ...INITIAL_STATE,
        unread: [makeNotification({ id: '1' })],
      };
      const result = notificationReducer(state, {
        type: 'DELETE_NOTIFICATION',
        id: '1',
      });
      expect(result.unread).toHaveLength(0);
    });

    it('should remove from read', () => {
      const state: NotificationState = {
        ...INITIAL_STATE,
        read: [makeNotification({ id: '1', readAt: '2026-01-01T00:00:00.000Z' })],
      };
      const result = notificationReducer(state, {
        type: 'DELETE_NOTIFICATION',
        id: '1',
      });
      expect(result.read).toHaveLength(0);
    });
  });
});
```

**Step 2: Run tests**

Run: `cd packages/notifications && pnpm test`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add packages/notifications/src/components/notification-reducer.test.ts
git commit -m "test(payload-notifications): add notification reducer unit tests"
```

---

### Task 8: Rewrite NotificationBell to use reducer and new endpoints

Replace the existing hook-based architecture with the reducer pattern.

**Files:**
- Modify: `packages/notifications/src/components/NotificationBell.tsx`

**Step 1: Rewrite the component**

Replace the entire file content with:

```tsx
'use client';

import { Collapsible } from '@base-ui/react/collapsible';
import { Popover } from '@base-ui/react/popover';
import { Button, useAuth, useConfig } from '@payloadcms/ui';
import { IconAdjustments, IconBell } from '@tabler/icons-react';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { toDocumentReference } from '@/helpers';
import type { User } from '@/payload-types';
import { ENDPOINTS } from '@/procedures';
import type {
  NotificationData,
  ResolvedPluginOptions,
  StoredDocumentReference,
} from '@/types';
import styles from './NotificationBell.module.css';
import { NotificationItem } from './NotificationItem';
import {
  INITIAL_STATE,
  notificationReducer,
  type NotificationAction,
  type NotificationState,
} from './notification-reducer';

export type NotificationBellProps = ResolvedPluginOptions<'pollInterval'>;

export function NotificationBell({ pollInterval }: NotificationBellProps) {
  const {
    config: {
      routes: { api: apiRoute },
    },
  } = useConfig();
  const { user } = useAuth<User>();

  const [state, dispatch] = useReducer(notificationReducer, INITIAL_STATE);

  useUnreadPolling(apiRoute, pollInterval, state, dispatch);
  const { loadMore, isLoadingRead } = useReadNotifications(
    apiRoute,
    state,
    dispatch,
  );
  const { markRead, markAllRead, deleteNotification } =
    useNotificationActions(apiRoute, dispatch);

  const { prefs, togglePref, unsubscribe } = useNotificationPreferences(
    apiRoute,
    user,
  );

  return (
    <Popover.Root>
      <Popover.Trigger render={<Button buttonStyle="tab" />}>
        <div className={styles.bellIcon}>
          <IconBell size={20} strokeWidth={1.5} />
          {state.unread.length > 0 && (
            <span className={styles.indicator}>{state.unread.length}</span>
          )}
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner align="start" sideOffset={8}>
          <Popover.Popup className={styles.popoverPopup}>
            <Popover.Arrow className={styles.popoverArrow}>
              {/** biome-ignore lint/a11y/noSvgWithoutTitle: gracefully ignored */}
              <svg fill="none" height="10" viewBox="0 0 20 10" width="20">
                <path d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H18.5349C17.5468 8 16.5936 7.63423 15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.25979 9.66437 2.60207Z" />
              </svg>
            </Popover.Arrow>
            <Popover.Viewport className={styles.popoverViewport}>
              <Collapsible.Root>
                <div className={styles.panelTop}>
                  <div className={styles.header}>
                    <h3 className={styles.title}>Notifications</h3>
                    <Collapsible.Trigger
                      aria-label="Notification settings"
                      className={styles.headerAction}
                      type="button"
                    >
                      <IconAdjustments size={18} strokeWidth={1.5} />
                    </Collapsible.Trigger>
                  </div>
                  <Collapsible.Panel className={styles.prefsPanel}>
                    <label className={styles.prefRow}>
                      <input
                        checked={prefs?.emailEnabled ?? true}
                        onChange={() => togglePref('emailEnabled')}
                        type="checkbox"
                      />
                      Email notifications
                    </label>
                  </Collapsible.Panel>
                </div>
              </Collapsible.Root>
              <div className={styles.sections}>
                {state.unread.length === 0 &&
                  !state.isReadLoaded && (
                    <p className={styles.empty}>No notifications</p>
                  )}

                {state.unread.map((n) => (
                  <NotificationItem
                    apiRoute={apiRoute}
                    key={n.id}
                    notification={n}
                    onDelete={deleteNotification}
                    onMarkRead={markRead}
                    onUnsubscribe={unsubscribe}
                  />
                ))}

                {!state.isReadLoaded && state.unread.length > 0 && (
                  <button
                    className={styles.showOlder}
                    onClick={loadMore}
                    type="button"
                  >
                    Show older
                  </button>
                )}

                {state.isReadLoaded && state.read.length === 0 && state.unread.length === 0 && (
                  <p className={styles.empty}>No notifications</p>
                )}

                {state.read.map((n) => (
                  <NotificationItem
                    apiRoute={apiRoute}
                    key={n.id}
                    notification={n}
                    onDelete={deleteNotification}
                    onMarkRead={markRead}
                    onUnsubscribe={unsubscribe}
                  />
                ))}

                {state.isReadLoaded && state.hasMoreRead && (
                  <button
                    className={styles.showOlder}
                    disabled={isLoadingRead}
                    onClick={loadMore}
                    type="button"
                  >
                    {isLoadingRead ? 'Loading...' : 'Show more'}
                  </button>
                )}
              </div>
            </Popover.Viewport>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Polls unread notifications with `since`-based diffing. */
function useUnreadPolling(
  apiRoute: string,
  pollInterval: number,
  state: NotificationState,
  dispatch: React.Dispatch<NotificationAction>,
) {
  const timestampRef = useRef(state.pollTimestamp);
  timestampRef.current = state.pollTimestamp;

  const poll = useCallback(async () => {
    try {
      const since = timestampRef.current ?? undefined;
      const { docs, timestamp } = await ENDPOINTS.unread.call(apiRoute, {
        since,
      });

      if (!timestampRef.current) {
        dispatch({ type: 'SET_UNREAD', docs, timestamp });
      } else {
        dispatch({ type: 'PREPEND_UNREAD', docs, timestamp });
      }
    } catch {
      // Poll will retry on next interval
    }
  }, [apiRoute, dispatch]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      poll();
      interval = setInterval(poll, pollInterval * 1000);
    };

    const stop = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [poll, pollInterval]);
}

/** On-demand paginated loading of read notifications. */
function useReadNotifications(
  apiRoute: string,
  state: NotificationState,
  dispatch: React.Dispatch<NotificationAction>,
) {
  const [isLoadingRead, setIsLoadingRead] = useState(false);
  const nextPage = state.readPage + 1;

  const loadMore = useCallback(async () => {
    setIsLoadingRead(true);
    try {
      const { docs, hasNextPage } = await ENDPOINTS.read.call(apiRoute, {
        page: nextPage,
        limit: 10,
      });
      dispatch({ type: 'APPEND_READ', docs, hasNextPage });
    } finally {
      setIsLoadingRead(false);
    }
  }, [apiRoute, nextPage, dispatch]);

  return { loadMore, isLoadingRead };
}

/** Optimistic mutations dispatched to the reducer. */
function useNotificationActions(
  apiRoute: string,
  dispatch: React.Dispatch<NotificationAction>,
) {
  const markRead = useCallback(
    async (id: string | number) => {
      dispatch({ type: 'MARK_READ', id });
      await ENDPOINTS.markRead.call(apiRoute, { id });
    },
    [apiRoute, dispatch],
  );

  const markAllRead = useCallback(async () => {
    dispatch({ type: 'MARK_ALL_READ' });
    await ENDPOINTS.markAllRead.call(apiRoute);
  }, [apiRoute, dispatch]);

  const deleteNotification = useCallback(
    async (id: string | number) => {
      dispatch({ type: 'DELETE_NOTIFICATION', id });
      await ENDPOINTS.deleteNotification.call(apiRoute, { id });
    },
    [apiRoute, dispatch],
  );

  return { markRead, markAllRead, deleteNotification };
}

/** Reads and toggles user-level notification preferences. */
function useNotificationPreferences(
  apiRoute: string,
  user: User | null | undefined,
) {
  const prefs = user?.notificationPreferences;

  const togglePref = useCallback(
    async (field: keyof Required<User>['notificationPreferences']) => {
      if (!user) return;
      const current = prefs?.[field] ?? true;
      await ENDPOINTS.updatePreferences.call(apiRoute, {
        [field]: !current,
      });
    },
    [apiRoute, user, prefs],
  );

  const unsubscribe = useCallback(
    async (ref: StoredDocumentReference) => {
      await ENDPOINTS.unsubscribe.call(apiRoute, {
        documentReference: toDocumentReference(ref),
      });
    },
    [apiRoute],
  );

  return { prefs, togglePref, unsubscribe };
}
```

Note: The `useState` import is missing from the import list at the top.
Add it to the React import: `import { useCallback, useEffect, useReducer, useRef, useState } from 'react';`

**Step 2: Verify types compile**

Run: `cd packages/notifications && pnpm check:types`
Expected: PASS

**Step 3: Commit**

```bash
git add packages/notifications/src/components/NotificationBell.tsx
git commit -m "feat(payload-notifications): rewrite NotificationBell with useReducer and polling"
```

---

### Task 9: Add CSS for "Show older" / "Show more" buttons

**Files:**
- Modify: `packages/notifications/src/components/NotificationBell.module.css`

**Step 1: Add the `showOlder` style**

Append to the end of the file:

```css
/* Show older / Show more */
.showOlder {
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: none;
  color: var(--theme-elevation-500);
  font-size: 0.75rem;
  text-align: center;
  cursor: pointer;
  border-top: 1px solid var(--theme-elevation-100);
}

.showOlder:hover {
  background-color: var(--theme-elevation-50);
  color: var(--theme-text);
}

.showOlder:disabled {
  cursor: default;
  opacity: 0.5;
}
```

**Step 2: Commit**

```bash
git add packages/notifications/src/components/NotificationBell.module.css
git commit -m "style(payload-notifications): add show older/more button styles"
```

---

### Task 10: Run lint and verify build

Final verification that everything compiles and passes.

**Step 1: Run lint**

Run: `cd packages/notifications && pnpm lint`
Expected: PASS (or only pre-existing warnings)

**Step 2: Run type check**

Run: `cd packages/notifications && pnpm check:types`
Expected: PASS

**Step 3: Run tests**

Run: `cd packages/notifications && pnpm test`
Expected: ALL PASS

**Step 4: Run build**

Run: `cd packages/notifications && pnpm build`
Expected: PASS

**Step 5: Commit any lint fixes**

```bash
git add -A packages/notifications/
git commit -m "chore(payload-notifications): lint fixes"
```
