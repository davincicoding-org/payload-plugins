# Notifications System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a generic `payload-notifications` plugin with email, in-app, and external callback channels, then extend `payload-discussions` with an `onComment` callback to wire the two together.

**Architecture:** Factory pattern (`createNotifications`) returns a Payload plugin plus a programmatic API handle. The discussions plugin adds a single `onComment` callback to its options. The consumer wires them in `payload.config.ts`. No source-code coupling between plugins.

**Tech Stack:** Payload 3.72, React 19, Next.js 15, TypeScript, Zod, `@payloadcms/ui` (Drawer, Pill, Toast, Button), `@payloadcms/email-resend`

**Design doc:** `docs/plans/2026-02-16-notifications-design.md`

---

## Task 1: Scaffold the notifications plugin

**Files:**
- Run: `pnpm generate` (plop) with name `notifications`, description `Generic notification infrastructure for Payload CMS with email, in-app, and external callback channels.`

**Step 1: Generate the plugin scaffold**

```bash
cd /Users/jarvis/Code/payload-plugins
echo "notifications\nGeneric notification infrastructure for Payload CMS with email, in-app, and external callback channels." | pnpm generate
```

If the interactive prompt doesn't accept piped input, create files manually matching the plop template output at `packages/notifications/`.

**Step 2: Install dependencies**

```bash
pnpm install
```

**Step 3: Verify scaffold builds**

```bash
cd packages/notifications
pnpm typecheck
```

Expected: No errors.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore(payload-notifications): scaffold plugin package"
```

---

## Task 2: Define types and configuration interface

**Files:**
- Modify: `packages/notifications/src/types.ts`

**Step 1: Write the failing test**

Create `packages/notifications/src/types.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { notifyInputSchema } from './types';

describe('notifyInputSchema', () => {
  it('should validate a complete notification input', () => {
    const result = notifyInputSchema.safeParse({
      recipient: 'user-1',
      event: 'comment.created',
      actor: { id: 'user-2', displayName: 'Alice' },
      subject: 'Alice commented on your post',
      url: '/admin/collections/feature-requests/123',
      meta: { commentId: 'abc' },
    });
    expect(result.success).toBe(true);
  });

  it('should validate without optional fields', () => {
    const result = notifyInputSchema.safeParse({
      recipient: 'user-1',
      event: 'comment.created',
      actor: { id: 'user-2', displayName: 'Alice' },
      subject: 'Alice commented on your post',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const result = notifyInputSchema.safeParse({
      recipient: 'user-1',
    });
    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/notifications
pnpm vitest run src/types.test.ts
```

Expected: FAIL — `notifyInputSchema` not found.

**Step 3: Write the types**

Replace `packages/notifications/src/types.ts` with:

```ts
import type { PayloadRequest } from 'payload';
import { z } from 'zod';

// --- Notification input ---

export const notifyInputSchema = z.object({
  recipient: z.union([z.string(), z.number()]),
  event: z.string(),
  actor: z.object({
    id: z.union([z.string(), z.number()]),
    displayName: z.string(),
  }),
  subject: z.string(),
  url: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
});

export type NotifyInput = z.infer<typeof notifyInputSchema>;

// --- Notification record (what gets stored) ---

export interface NotificationRecord {
  id: string | number;
  recipient: string | number;
  event: string;
  actorId: string | number;
  actorDisplayName: string;
  subject: string;
  url?: string | null;
  meta?: Record<string, unknown> | null;
  readAt?: string | null;
  emailSentAt?: string | null;
  emailError?: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Plugin configuration ---

export interface NotificationEmailConfig {
  generateHTML: (args: {
    notification: NotifyInput;
    recipient: { id: string | number; email: string };
  }) => string | Promise<string>;
  generateSubject: (args: {
    notification: NotifyInput;
    recipient: { id: string | number; email: string };
  }) => string | Promise<string>;
}

export interface NotificationsConfig {
  /** Email channel configuration. If omitted, email delivery is skipped. */
  email?: NotificationEmailConfig;
  /** External callback fired for every notification. */
  onNotify?: (args: {
    req: PayloadRequest;
    notification: NotifyInput;
    recipient: { id: string | number; email: string };
  }) => void | Promise<void>;
  /** Slug for the notifications collection. @default "notifications" */
  notificationsSlug?: string;
  /** Slug for the subscriptions collection. @default "subscriptions" */
  subscriptionsSlug?: string;
  /** Poll interval in seconds for the bell icon. @default 30 */
  pollInterval?: number;
}
```

**Step 4: Run test to verify it passes**

```bash
cd packages/notifications
pnpm vitest run src/types.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(payload-notifications): define types and configuration interface"
```

---

## Task 3: Create the notifications collection

**Files:**
- Create: `packages/notifications/src/collections/notifications.ts`

**Step 1: Write the collection definition**

```ts
import { createCollectionConfigFactory } from '@repo/common';

export const Notifications = createCollectionConfigFactory(({ slug }) => ({
  admin: { hidden: true },
  access: {
    read: ({ req }) => {
      if (!req.user) return false;
      return { recipient: { equals: req.user.id } };
    },
    create: () => false,
    update: ({ req }) => {
      if (!req.user) return false;
      return { recipient: { equals: req.user.id } };
    },
    delete: () => false,
  },
  fields: [
    {
      name: 'recipient',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    { name: 'event', type: 'text', required: true },
    {
      name: 'actor',
      type: 'group',
      fields: [
        { name: 'id', type: 'relationship', relationTo: 'users', required: true },
        { name: 'displayName', type: 'text', required: true },
      ],
    },
    { name: 'subject', type: 'text', required: true },
    { name: 'url', type: 'text' },
    { name: 'meta', type: 'json' },
    { name: 'readAt', type: 'date' },
    { name: 'emailSentAt', type: 'date' },
    { name: 'emailError', type: 'text' },
  ],
}));
```

**Step 2: Verify typecheck**

```bash
cd packages/notifications && pnpm typecheck
```

Expected: No errors.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(payload-notifications): add notifications collection"
```

---

## Task 4: Create the subscriptions collection

**Files:**
- Create: `packages/notifications/src/collections/subscriptions.ts`

**Step 1: Write the collection definition**

```ts
import { createCollectionConfigFactory } from '@repo/common';

export const Subscriptions = createCollectionConfigFactory(({ slug }) => ({
  admin: { hidden: true },
  access: {
    read: ({ req }) => {
      if (!req.user) return false;
      return { user: { equals: req.user.id } };
    },
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    { name: 'documentId', type: 'text', required: true, index: true },
    { name: 'collectionSlug', type: 'text', required: true },
    {
      name: 'reason',
      type: 'select',
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'Auto', value: 'auto' },
      ],
      defaultValue: 'auto',
      required: true,
    },
  ],
}));
```

**Step 2: Verify typecheck**

```bash
cd packages/notifications && pnpm typecheck
```

Expected: No errors.

**Step 3: Commit**

```bash
git add -A
git commit -m "feat(payload-notifications): add subscriptions collection"
```

---

## Task 5: Implement the `createNotifications` factory and core API

This is the heart of the plugin — the factory that returns `.plugin()` plus the programmatic API (`.notify()`, `.subscribe()`, `.unsubscribe()`, `.getSubscribers()`).

**Files:**
- Modify: `packages/notifications/src/index.ts`

**Step 1: Write the failing test**

Create `packages/notifications/src/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createNotifications } from './index';

describe('createNotifications', () => {
  it('should return an object with plugin and API methods', () => {
    const notifications = createNotifications({});
    expect(notifications.plugin).toBeTypeOf('function');
    expect(notifications.notify).toBeTypeOf('function');
    expect(notifications.subscribe).toBeTypeOf('function');
    expect(notifications.unsubscribe).toBeTypeOf('function');
    expect(notifications.getSubscribers).toBeTypeOf('function');
  });

  it('should return a valid Payload plugin function', () => {
    const notifications = createNotifications({});
    const plugin = notifications.plugin();
    expect(plugin).toBeTypeOf('function');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/notifications
pnpm vitest run src/index.test.ts
```

Expected: FAIL — `createNotifications` not exported.

**Step 3: Implement the factory**

Replace `packages/notifications/src/index.ts`:

```ts
import type { CollectionSlug, Plugin } from 'payload';
import type { PayloadRequest } from 'payload';
import { Notifications } from './collections/notifications';
import { Subscriptions } from './collections/subscriptions';
import type { NotificationsConfig, NotifyInput } from './types';
import { notifyInputSchema } from './types';

export type { NotificationsConfig, NotifyInput } from './types';

export interface NotificationsAPI {
  plugin: () => Plugin;
  notify: (req: PayloadRequest, input: NotifyInput) => Promise<void>;
  subscribe: (
    req: PayloadRequest,
    userId: string | number,
    documentId: string,
    collectionSlug: string,
    reason?: 'manual' | 'auto',
  ) => Promise<void>;
  unsubscribe: (
    req: PayloadRequest,
    userId: string | number,
    documentId: string,
    collectionSlug: string,
  ) => Promise<void>;
  getSubscribers: (
    req: PayloadRequest,
    documentId: string,
    collectionSlug: string,
  ) => Promise<(string | number)[]>;
}

export const createNotifications = (
  config: NotificationsConfig = {},
): NotificationsAPI => {
  const {
    notificationsSlug = 'notifications',
    subscriptionsSlug = 'subscriptions',
    pollInterval = 30,
    email,
    onNotify,
  } = config;

  const notifSlug = notificationsSlug as CollectionSlug;
  const subsSlug = subscriptionsSlug as CollectionSlug;

  const plugin = (): Plugin => (payloadConfig) => {
    payloadConfig.collections ??= [];
    payloadConfig.collections.push(Notifications({ slug: notifSlug }));
    payloadConfig.collections.push(Subscriptions({ slug: subsSlug }));

    // Add notification preferences to users collection
    const usersCollection = payloadConfig.collections.find(
      (c) => c.slug === payloadConfig.admin?.user,
    );
    if (usersCollection) {
      usersCollection.fields ??= [];
      usersCollection.fields.push({
        name: 'notificationPreferences',
        type: 'group',
        admin: { position: 'sidebar' },
        fields: [
          {
            name: 'emailEnabled',
            type: 'checkbox',
            defaultValue: true,
            label: 'Email notifications',
          },
          {
            name: 'inAppEnabled',
            type: 'checkbox',
            defaultValue: true,
            label: 'In-app notifications',
          },
        ],
      });
    }

    // Register API endpoints (mark-read, mark-all-read, unread-count, subscribe, unsubscribe)
    payloadConfig.endpoints ??= [];
    payloadConfig.endpoints.push(
      markReadEndpoint(notifSlug),
      markAllReadEndpoint(notifSlug),
      unreadCountEndpoint(notifSlug),
      subscribeEndpoint(subsSlug),
      unsubscribeEndpoint(subsSlug),
    );

    // Register afterNavLinks for bell icon
    payloadConfig.admin ??= {};
    payloadConfig.admin.components ??= {};
    payloadConfig.admin.components.afterNavLinks ??= [];
    payloadConfig.admin.components.afterNavLinks.push({
      path: 'payload-notifications/client#NotificationBell',
      clientProps: { pollInterval },
    });

    return payloadConfig;
  };

  const notify = async (req: PayloadRequest, input: NotifyInput): Promise<void> => {
    const parsed = notifyInputSchema.parse(input);

    // Look up recipient's preferences
    const recipient = await req.payload.findByID({
      collection: (req.payload.config.admin?.user ?? 'users') as CollectionSlug,
      id: parsed.recipient,
      depth: 0,
    });

    const prefs = (recipient as Record<string, unknown>).notificationPreferences as
      | { emailEnabled?: boolean; inAppEnabled?: boolean }
      | undefined;

    const emailEnabled = prefs?.emailEnabled !== false;
    const inAppEnabled = prefs?.inAppEnabled !== false;

    const recipientEmail = (recipient as Record<string, unknown>).email as string;

    // In-app: create notification row
    if (inAppEnabled) {
      await req.payload.create({
        collection: notifSlug,
        data: {
          recipient: parsed.recipient,
          event: parsed.event,
          actor: { id: parsed.actor.id, displayName: parsed.actor.displayName },
          subject: parsed.subject,
          url: parsed.url ?? null,
          meta: parsed.meta ?? null,
        },
        req,
      });
    }

    // Email: send via Payload's email adapter
    if (email && emailEnabled && recipientEmail) {
      try {
        const [html, subject] = await Promise.all([
          email.generateHTML({
            notification: parsed,
            recipient: { id: parsed.recipient, email: recipientEmail },
          }),
          email.generateSubject({
            notification: parsed,
            recipient: { id: parsed.recipient, email: recipientEmail },
          }),
        ]);
        await req.payload.sendEmail({ to: recipientEmail, subject, html });
      } catch (err) {
        // Log error but don't block — record it on the notification if it exists
        console.error('[payload-notifications] Email delivery failed:', err);
      }
    }

    // External callback
    if (onNotify) {
      try {
        await onNotify({
          req,
          notification: parsed,
          recipient: { id: parsed.recipient, email: recipientEmail },
        });
      } catch (err) {
        console.error('[payload-notifications] onNotify callback failed:', err);
      }
    }
  };

  const subscribe = async (
    req: PayloadRequest,
    userId: string | number,
    documentId: string,
    collectionSlug: string,
    reason: 'manual' | 'auto' = 'auto',
  ): Promise<void> => {
    // Check if subscription already exists
    const existing = await req.payload.find({
      collection: subsSlug,
      where: {
        and: [
          { user: { equals: userId } },
          { documentId: { equals: documentId } },
          { collectionSlug: { equals: collectionSlug } },
        ],
      },
      limit: 1,
    });

    if (existing.totalDocs > 0) return;

    await req.payload.create({
      collection: subsSlug,
      data: { user: userId, documentId, collectionSlug, reason },
      req,
    });
  };

  const unsubscribe = async (
    req: PayloadRequest,
    userId: string | number,
    documentId: string,
    collectionSlug: string,
  ): Promise<void> => {
    await req.payload.delete({
      collection: subsSlug,
      where: {
        and: [
          { user: { equals: userId } },
          { documentId: { equals: documentId } },
          { collectionSlug: { equals: collectionSlug } },
        ],
      },
      req,
    });
  };

  const getSubscribers = async (
    req: PayloadRequest,
    documentId: string,
    collectionSlug: string,
  ): Promise<(string | number)[]> => {
    const results = await req.payload.find({
      collection: subsSlug,
      where: {
        and: [
          { documentId: { equals: documentId } },
          { collectionSlug: { equals: collectionSlug } },
        ],
      },
      limit: 0,
      depth: 0,
    });

    return results.docs.map((doc) => doc.user as string | number);
  };

  return { plugin, notify, subscribe, unsubscribe, getSubscribers };
};

// --- Internal endpoint factories ---

function markReadEndpoint(notifSlug: CollectionSlug) {
  return {
    path: '/notifications-plugin/mark-read' as const,
    method: 'post' as const,
    handler: async (req: PayloadRequest) => {
      if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const { addDataAndFileToRequest } = await import('payload');
      await addDataAndFileToRequest(req);
      const { id } = req.data as { id: string | number };
      await req.payload.update({
        collection: notifSlug,
        id,
        data: { readAt: new Date().toISOString() },
        req,
      });
      return Response.json({ success: true });
    },
  };
}

function markAllReadEndpoint(notifSlug: CollectionSlug) {
  return {
    path: '/notifications-plugin/mark-all-read' as const,
    method: 'post' as const,
    handler: async (req: PayloadRequest) => {
      if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      await req.payload.update({
        collection: notifSlug,
        where: {
          and: [
            { recipient: { equals: req.user.id } },
            { readAt: { exists: false } },
          ],
        },
        data: { readAt: new Date().toISOString() },
        req,
      });
      return Response.json({ success: true });
    },
  };
}

function unreadCountEndpoint(notifSlug: CollectionSlug) {
  return {
    path: '/notifications-plugin/unread-count' as const,
    method: 'get' as const,
    handler: async (req: PayloadRequest) => {
      if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const result = await req.payload.count({
        collection: notifSlug,
        where: {
          and: [
            { recipient: { equals: req.user.id } },
            { readAt: { exists: false } },
          ],
        },
      });
      return Response.json({ count: result.totalDocs });
    },
  };
}

function subscribeEndpoint(subsSlug: CollectionSlug) {
  return {
    path: '/notifications-plugin/subscribe' as const,
    method: 'post' as const,
    handler: async (req: PayloadRequest) => {
      if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const { addDataAndFileToRequest } = await import('payload');
      await addDataAndFileToRequest(req);
      const { documentId, collectionSlug } = req.data as {
        documentId: string;
        collectionSlug: string;
      };

      const existing = await req.payload.find({
        collection: subsSlug,
        where: {
          and: [
            { user: { equals: req.user.id } },
            { documentId: { equals: documentId } },
            { collectionSlug: { equals: collectionSlug } },
          ],
        },
        limit: 1,
      });

      if (existing.totalDocs > 0) {
        return Response.json({ success: true, alreadySubscribed: true });
      }

      await req.payload.create({
        collection: subsSlug,
        data: {
          user: req.user.id,
          documentId,
          collectionSlug,
          reason: 'manual',
        },
        req,
      });
      return Response.json({ success: true });
    },
  };
}

function unsubscribeEndpoint(subsSlug: CollectionSlug) {
  return {
    path: '/notifications-plugin/unsubscribe' as const,
    method: 'post' as const,
    handler: async (req: PayloadRequest) => {
      if (!req.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      const { addDataAndFileToRequest } = await import('payload');
      await addDataAndFileToRequest(req);
      const { documentId, collectionSlug } = req.data as {
        documentId: string;
        collectionSlug: string;
      };
      await req.payload.delete({
        collection: subsSlug,
        where: {
          and: [
            { user: { equals: req.user.id } },
            { documentId: { equals: documentId } },
            { collectionSlug: { equals: collectionSlug } },
          ],
        },
        req,
      });
      return Response.json({ success: true });
    },
  };
}
```

**Step 4: Run test to verify it passes**

```bash
cd packages/notifications
pnpm vitest run src/index.test.ts
```

Expected: PASS.

**Step 5: Typecheck the whole package**

```bash
cd packages/notifications && pnpm typecheck
```

Expected: No errors (may need to generate types first with `pnpm generate:types`).

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(payload-notifications): implement createNotifications factory and core API"
```

---

## Task 6: Build the NotificationBell client component

**Files:**
- Create: `packages/notifications/src/components/NotificationBell.tsx`
- Create: `packages/notifications/src/components/NotificationBell.module.css`
- Create: `packages/notifications/src/components/NotificationDrawer.tsx`
- Create: `packages/notifications/src/components/NotificationDrawer.module.css`
- Create: `packages/notifications/src/components/NotificationItem.tsx`
- Create: `packages/notifications/src/components/NotificationItem.module.css`
- Modify: `packages/notifications/src/exports/client.ts`

**Step 1: Create the NotificationBell component**

`packages/notifications/src/components/NotificationBell.tsx`:

```tsx
'use client';

import { Pill, useConfig } from '@payloadcms/ui';
import { useCallback, useEffect, useState } from 'react';
import { NotificationDrawer } from './NotificationDrawer';
import styles from './NotificationBell.module.css';

interface NotificationBellProps {
  pollInterval: number;
}

export function NotificationBell({ pollInterval }: NotificationBellProps) {
  const {
    config: {
      routes: { api: apiRoute },
    },
  } = useConfig();

  const [unreadCount, setUnreadCount] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch(`${apiRoute}/notifications-plugin/unread-count`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch {
      // Silently fail — poll will retry
    }
  }, [apiRoute]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, pollInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount, pollInterval]);

  return (
    <>
      <button
        type="button"
        className={styles.bellButton}
        onClick={() => setIsDrawerOpen(true)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <span className={styles.bellIcon}>&#128276;</span>
        {unreadCount > 0 && <Pill>{String(unreadCount)}</Pill>}
      </button>

      {isDrawerOpen && (
        <NotificationDrawer
          onClose={() => {
            setIsDrawerOpen(false);
            fetchUnreadCount();
          }}
        />
      )}
    </>
  );
}
```

`packages/notifications/src/components/NotificationBell.module.css`:

```css
.bellButton {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px;
  position: relative;
}

.bellIcon {
  font-size: 18px;
}
```

**Step 2: Create the NotificationDrawer component**

`packages/notifications/src/components/NotificationDrawer.tsx`:

```tsx
'use client';

import { useConfig } from '@payloadcms/ui';
import { useCallback, useEffect, useState } from 'react';
import { NotificationItem } from './NotificationItem';
import styles from './NotificationDrawer.module.css';

interface Notification {
  id: string | number;
  event: string;
  actor: { id: string | number; displayName: string };
  subject: string;
  url?: string | null;
  readAt?: string | null;
  createdAt: string;
}

interface NotificationDrawerProps {
  onClose: () => void;
}

export function NotificationDrawer({ onClose }: NotificationDrawerProps) {
  const {
    config: {
      routes: { api: apiRoute },
    },
  } = useConfig();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch(
          `${apiRoute}/notifications?sort=-createdAt&limit=20&depth=0`,
          { credentials: 'include' },
        );
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.docs);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotifications();
  }, [apiRoute]);

  const markRead = useCallback(
    async (id: string | number) => {
      await fetch(`${apiRoute}/notifications-plugin/mark-read`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      );
    },
    [apiRoute],
  );

  const markAllRead = useCallback(async () => {
    await fetch(`${apiRoute}/notifications-plugin/mark-all-read`, {
      method: 'POST',
      credentials: 'include',
    });
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
    );
  }, [apiRoute]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Notifications</h3>
          <button type="button" className={styles.markAll} onClick={markAllRead}>
            Mark all as read
          </button>
          <button type="button" className={styles.close} onClick={onClose}>
            &times;
          </button>
        </div>
        <div className={styles.list}>
          {isLoading && <p className={styles.empty}>Loading...</p>}
          {!isLoading && notifications.length === 0 && (
            <p className={styles.empty}>No notifications</p>
          )}
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={markRead}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

`packages/notifications/src/components/NotificationDrawer.module.css`:

```css
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.3);
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 400px;
  max-width: 100vw;
  background: var(--theme-bg);
  border-left: 1px solid var(--theme-border-color);
  display: flex;
  flex-direction: column;
  z-index: 1001;
}

.header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-bottom: 1px solid var(--theme-border-color);
}

.title {
  margin: 0;
  flex: 1;
  font-size: 16px;
}

.markAll {
  background: none;
  border: none;
  color: var(--theme-text);
  cursor: pointer;
  font-size: 12px;
  opacity: 0.7;
  text-decoration: underline;
}

.close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 20px;
  color: var(--theme-text);
}

.list {
  flex: 1;
  overflow-y: auto;
}

.empty {
  padding: 32px 16px;
  text-align: center;
  opacity: 0.5;
}
```

**Step 3: Create the NotificationItem component**

`packages/notifications/src/components/NotificationItem.tsx`:

```tsx
'use client';

import { formatTimeToNow } from '@payloadcms/ui';
import { useRouter } from 'next/navigation.js';
import styles from './NotificationItem.module.css';

interface Notification {
  id: string | number;
  event: string;
  actor: { id: string | number; displayName: string };
  subject: string;
  url?: string | null;
  readAt?: string | null;
  createdAt: string;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string | number) => void;
}

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const router = useRouter();
  const isUnread = !notification.readAt;

  const handleClick = () => {
    if (isUnread) onMarkRead(notification.id);
    if (notification.url) router.push(notification.url);
  };

  return (
    <button type="button" className={styles.item} onClick={handleClick} data-unread={isUnread}>
      {isUnread && <span className={styles.dot} />}
      <div className={styles.content}>
        <p className={styles.subject}>{notification.subject}</p>
        <time className={styles.time}>{formatTimeToNow({ date: new Date(notification.createdAt) })}</time>
      </div>
    </button>
  );
}
```

`packages/notifications/src/components/NotificationItem.module.css`:

```css
.item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 16px;
  width: 100%;
  background: none;
  border: none;
  border-bottom: 1px solid var(--theme-border-color);
  cursor: pointer;
  text-align: left;
}

.item[data-unread='true'] {
  background: var(--theme-elevation-50);
}

.item:hover {
  background: var(--theme-elevation-100);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--theme-success-500);
  flex-shrink: 0;
  margin-top: 6px;
}

.content {
  flex: 1;
  min-width: 0;
}

.subject {
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
}

.time {
  font-size: 12px;
  opacity: 0.6;
}
```

**Step 4: Export from client entry**

Update `packages/notifications/src/exports/client.ts`:

```ts
export { NotificationBell } from '../components/NotificationBell';
```

**Step 5: Verify typecheck**

```bash
cd packages/notifications && pnpm typecheck
```

Expected: No errors.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(payload-notifications): add NotificationBell, Drawer, and Item components"
```

---

## Task 7: Extend the discussions plugin with `onComment` callback

**Files:**
- Modify: `packages/discussions/src/index.ts` (add `onComment` to options)
- Modify: `packages/discussions/src/types.ts` (add `OnCommentArgs` type)
- Modify: `packages/discussions/src/endpoints/create-comment.ts` (call `onComment`)
- Modify: `packages/discussions/src/endpoints/create-reply.ts` (call `onComment`)

**Step 1: Add the `OnCommentArgs` type**

In `packages/discussions/src/types.ts`, add at the end:

```ts
import type { PayloadRequest } from 'payload';

export interface OnCommentArgs {
  req: PayloadRequest;
  comment: Comment;
  /** Present when this is a reply, absent for top-level comments. */
  parentComment?: Comment;
  /** The top-level comment of the thread. Present when this is a reply. */
  rootComment?: Comment;
  documentId: string;
  collectionSlug: string;
}
```

Note: `Comment` is imported from `@/payload-types` (already imported in this file).

**Step 2: Add `onComment` to plugin options**

In `packages/discussions/src/index.ts`, add to `DiscussionsPluginOptions`:

```ts
import type { OnCommentArgs } from './types';

export interface DiscussionsPluginOptions {
  collections?: CollectionSlug[];
  globals?: GlobalSlug[];
  maxCommentDepth?: number;
  collectionSlug?: CollectionSlug;
  /** Called after a comment or reply is created. */
  onComment?: (args: OnCommentArgs) => void | Promise<void>;
}
```

Pass `onComment` to both endpoint factories:

```ts
config.endpoints.push(createCommentEndpoint({ collectionSlug, onComment }));
config.endpoints.push(createReplyEndpoint({ collectionSlug, onComment }));
```

**Step 3: Call `onComment` in `create-comment.ts`**

In `packages/discussions/src/endpoints/create-comment.ts`, accept `onComment` in the options object and call it after the comment is created and populated:

```ts
import type { OnCommentArgs } from '@/types';

export const createCommentEndpoint = ({
  collectionSlug,
  onComment,
}: {
  collectionSlug: string;
  onComment?: (args: OnCommentArgs) => void | Promise<void>;
}): Endpoint =>
  ENDPOINTS.createComment.endpoint(
    async (req, { documentCollectionSlug, documentId, content }) => {
      // ... existing logic stays the same ...

      const populated = populateComment(createdComment, req.payload);

      // Fire callback (no parentComment or rootComment — this is top-level)
      if (onComment) {
        // Fire and forget — don't block the response
        Promise.resolve(
          onComment({
            req,
            comment: createdComment,
            documentId: String(documentId),
            collectionSlug: documentCollectionSlug,
          }),
        ).catch((err) =>
          console.error('[payload-discussions] onComment callback error:', err),
        );
      }

      return populated;
    },
  );
```

**Step 4: Call `onComment` in `create-reply.ts`**

In `packages/discussions/src/endpoints/create-reply.ts`, accept `onComment` and resolve the root comment:

```ts
import type { OnCommentArgs } from '@/types';

export const createReplyEndpoint = ({
  collectionSlug,
  onComment,
}: {
  collectionSlug: string;
  onComment?: (args: OnCommentArgs) => void | Promise<void>;
}): Endpoint =>
  ENDPOINTS.createReply.endpoint(async (req, { parentId, content }) => {
    // ... existing logic stays the same ...

    const populated = populateComment(createdReply, req.payload);

    if (onComment) {
      // Resolve the root comment by walking up the parent chain.
      // For now, the parent IS passed. The consumer can walk up
      // via rootComment if needed. We need to find the document
      // that owns this thread to pass documentId + collectionSlug.
      //
      // To find the document: search all collections for a document
      // whose `discussions` field contains the root comment ID.
      // This is an area where the callback args may need refinement
      // based on real usage — for the initial implementation, pass
      // parent as both parentComment and rootComment.

      Promise.resolve(
        onComment({
          req,
          comment: createdReply,
          parentComment: parent as unknown as Comment,
          rootComment: parent as unknown as Comment,
          documentId: '', // TODO: resolve from thread — see Task 8
          collectionSlug: '',
        }),
      ).catch((err) =>
        console.error('[payload-discussions] onComment callback error:', err),
      );
    }

    return populated;
  });
```

**Step 5: Run typecheck**

```bash
cd packages/discussions && pnpm typecheck
```

Expected: No errors.

**Step 6: Run existing tests**

```bash
cd packages/discussions && pnpm test
```

Expected: PASS (existing tests should still pass; `onComment` is optional).

**Step 7: Commit**

```bash
git add -A
git commit -m "feat(payload-discussions): add onComment callback to plugin options"
```

---

## Task 8: Resolve documentId in reply callback

The `create-reply` endpoint currently doesn't know which document owns the thread. We need to trace from a reply up to the root comment, then find which document's `discussions` field contains that root.

**Files:**
- Create: `packages/discussions/src/utils/resolve-thread-context.ts`
- Modify: `packages/discussions/src/endpoints/create-reply.ts`

**Step 1: Write the failing test**

Create `packages/discussions/src/utils/resolve-thread-context.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { findRootComment } from './resolve-thread-context';

describe('findRootComment', () => {
  it('should return the comment itself if it has no parent', async () => {
    const mockPayload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
    };
    // A root comment won't appear as a reply in any other comment
    const comment = { id: '1', content: 'hello', replies: [] };
    const root = await findRootComment(mockPayload as any, '1', 'comments');
    // When no parent found, the input ID is the root
    expect(root).toBe('1');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/discussions && pnpm vitest run src/utils/resolve-thread-context.test.ts
```

Expected: FAIL — module not found.

**Step 3: Implement**

Create `packages/discussions/src/utils/resolve-thread-context.ts`:

```ts
import type { BasePayload, CollectionSlug } from 'payload';

/**
 * Walk up the reply chain to find the root (top-level) comment ID.
 * A root comment is one that is not in any other comment's `replies` field.
 */
export async function findRootComment(
  payload: BasePayload,
  commentId: string | number,
  commentsSlug: string,
): Promise<string | number> {
  let currentId = commentId;

  // Walk up: find a comment whose replies contain currentId
  for (let depth = 0; depth < 20; depth++) {
    const parent = await payload.find({
      collection: commentsSlug as CollectionSlug,
      where: { replies: { contains: currentId } },
      limit: 1,
      depth: 0,
    });

    if (parent.totalDocs === 0) break;
    currentId = parent.docs[0].id;
  }

  return currentId;
}

/**
 * Find the document that owns a root comment by searching for
 * a document whose `discussions` field contains the root comment ID.
 */
export async function findDocumentForComment(
  payload: BasePayload,
  rootCommentId: string | number,
  targetCollections: string[],
): Promise<{ documentId: string; collectionSlug: string } | null> {
  for (const slug of targetCollections) {
    const result = await payload.find({
      collection: slug as CollectionSlug,
      where: { discussions: { contains: rootCommentId } },
      limit: 1,
      depth: 0,
    });

    if (result.totalDocs > 0) {
      return {
        documentId: String(result.docs[0].id),
        collectionSlug: slug,
      };
    }
  }

  return null;
}
```

**Step 4: Run test to verify it passes**

```bash
cd packages/discussions && pnpm vitest run src/utils/resolve-thread-context.test.ts
```

Expected: PASS.

**Step 5: Wire into `create-reply.ts`**

Update the `onComment` call in `create-reply.ts` to use the resolver. The endpoint factory needs to receive `targetCollections` (the list of collections with discussions enabled):

```ts
export const createReplyEndpoint = ({
  collectionSlug,
  onComment,
  targetCollections,
}: {
  collectionSlug: string;
  onComment?: (args: OnCommentArgs) => void | Promise<void>;
  targetCollections: string[];
}): Endpoint =>
```

Then in the handler, after creating the reply:

```ts
if (onComment) {
  Promise.resolve(
    (async () => {
      const rootId = await findRootComment(req.payload, parentId, collectionSlug);
      const rootComment = await req.payload.findByID({
        collection: collectionSlug as CollectionSlug,
        id: rootId,
        depth: 1,
      });
      const docContext = await findDocumentForComment(
        req.payload,
        rootId,
        targetCollections,
      );
      onComment({
        req,
        comment: createdReply,
        parentComment: parent as unknown as Comment,
        rootComment: rootComment as unknown as Comment,
        documentId: docContext?.documentId ?? '',
        collectionSlug: docContext?.collectionSlug ?? '',
      });
    })(),
  ).catch((err) =>
    console.error('[payload-discussions] onComment callback error:', err),
  );
}
```

Also update `index.ts` to pass `targetCollections` to the endpoint factory:

```ts
config.endpoints.push(
  createReplyEndpoint({
    collectionSlug,
    onComment,
    targetCollections: collections.map(String),
  }),
);
```

**Step 6: Run typecheck and tests**

```bash
cd packages/discussions && pnpm typecheck && pnpm test
```

Expected: PASS.

**Step 7: Commit**

```bash
git add -A
git commit -m "feat(payload-discussions): resolve document context for reply callbacks"
```

---

## Task 9: Wire the two plugins together in the sandbox

**Files:**
- Modify: `sandbox/src/payload.config.ts`

**Step 1: Update the sandbox config**

```ts
import { createNotifications } from 'payload-notifications';
import { discussionsPlugin } from 'payload-discussions';

const notifications = createNotifications({
  email: {
    generateHTML: ({ notification }) =>
      `<p>${notification.subject}</p>`,
    generateSubject: ({ notification }) =>
      notification.subject,
  },
});

// In the plugins array:
plugins: [
  notifications.plugin(),
  discussionsPlugin({
    collections: ['feature-requests'],
    onComment: async ({ req, comment, parentComment, documentId, collectionSlug }) => {
      const authorId = typeof comment.author === 'object'
        ? comment.author?.id
        : comment.author;

      if (!authorId) return;

      // Auto-subscribe the commenter
      await notifications.subscribe(req, authorId, documentId, collectionSlug, 'auto');

      // Get all subscribers
      const subscribers = await notifications.getSubscribers(req, documentId, collectionSlug);

      // Resolve actor display name
      const actor = typeof comment.author === 'object' && comment.author
        ? { id: comment.author.id, displayName: comment.author.email ?? 'Unknown' }
        : { id: authorId, displayName: 'Unknown' };

      // Determine event type
      const event = parentComment ? 'reply.direct' : 'comment.created';

      // Build recipients: all subscribers except the author
      const recipients = subscribers.filter((id) => String(id) !== String(authorId));

      for (const recipientId of recipients) {
        await notifications.notify(req, {
          recipient: recipientId,
          event,
          actor,
          subject: parentComment
            ? `${actor.displayName} replied to a comment`
            : `${actor.displayName} commented on a document`,
          url: `/admin/collections/${collectionSlug}/${documentId}`,
        });
      }
    },
  }),
  // ... rest of plugins
],
```

**Step 2: Add `payload-notifications` to sandbox dependencies**

In `sandbox/package.json`, add:

```json
"payload-notifications": "workspace:*"
```

Then run:

```bash
pnpm install
```

**Step 3: Generate types and verify sandbox builds**

```bash
cd sandbox && pnpm typecheck
```

Expected: No errors.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(sandbox): wire notifications and discussions plugins together"
```

---

## Task 10: Manual integration test

**Step 1: Start the dev server**

```bash
pnpm dev
```

**Step 2: Test the full flow**

1. Open the admin panel, log in
2. Navigate to Feature Requests, open one
3. Post a comment as User A
4. Log in as User B, post a reply
5. Verify User A sees a notification in the bell icon
6. Click the notification, verify it navigates to the document
7. Verify "Mark all as read" works
8. Check email delivery (if Resend is configured) or check console for email errors

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix(payload-notifications): address integration test findings"
```

---

## Summary of tasks

| # | Task | Plugin |
|---|------|--------|
| 1 | Scaffold notifications plugin | notifications |
| 2 | Define types and config interface | notifications |
| 3 | Create notifications collection | notifications |
| 4 | Create subscriptions collection | notifications |
| 5 | Implement `createNotifications` factory + core API | notifications |
| 6 | Build NotificationBell + Drawer + Item components | notifications |
| 7 | Add `onComment` callback to discussions plugin | discussions |
| 8 | Resolve documentId in reply callback | discussions |
| 9 | Wire both plugins in sandbox | sandbox |
| 10 | Manual integration test | all |
