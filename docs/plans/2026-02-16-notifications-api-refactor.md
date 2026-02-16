# Notifications Plugin API Refactor

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the factory pattern (`createNotifications()`) with a direct plugin export + standalone API functions that read their config from `config.custom`.

**Architecture:** The plugin stores its runtime config (slugs, email config, onNotify callback) on `config.custom['notifications-plugin']` during config build. Standalone exported functions (`notify`, `subscribe`, `unsubscribe`, `getSubscribers`) read that context from `req.payload.config.custom` at call time. The consumer never interacts with `config.custom` directly.

**Tech Stack:** Payload CMS plugin system, Zod, TypeScript

---

### Task 1: Create the plugin context module

**Files:**
- Create: `packages/notifications/src/context.ts`

**Step 1: Write the context module**

Create a module that stores and retrieves the plugin's runtime config from `config.custom`, following the intl plugin's `attachPluginContext`/`getPluginContext` pattern.

```ts
import type { Config, SanitizedConfig } from 'payload';
import type { NotificationsConfig } from './types';

const PLUGIN_KEY = 'notifications-plugin';

export interface PluginContext {
  notificationsSlug: string;
  subscriptionsSlug: string;
  pollInterval: number;
  email: NotificationsConfig['email'];
  onNotify: NotificationsConfig['onNotify'];
}

export const attachPluginContext = (
  config: Config,
  context: PluginContext,
): void => {
  config.custom ??= {};
  config.custom[PLUGIN_KEY] = context;
};

export const getPluginContext = (config: SanitizedConfig): PluginContext => {
  const ctx = config.custom?.[PLUGIN_KEY] as PluginContext | undefined;
  if (!ctx) {
    throw new Error(
      '[payload-notifications] Plugin context not found. Did you add notificationsPlugin() to your plugins array?',
    );
  }
  return ctx;
};
```

**Step 2: Commit**

```bash
git add packages/notifications/src/context.ts
git commit -m "feat(payload-notifications): add plugin context module"
```

---

### Task 2: Rewrite index.ts — direct plugin export + standalone functions

**Files:**
- Modify: `packages/notifications/src/index.ts` (full rewrite)

**Step 1: Rewrite the module**

Replace `createNotifications` factory with:

1. `notificationsPlugin(config)` — direct plugin export (like `discussionsPlugin`)
2. `notify(req, input)` — standalone function
3. `subscribe(req, userId, documentId, collectionSlug, reason?)` — standalone function
4. `unsubscribe(req, userId, documentId, collectionSlug)` — standalone function
5. `getSubscribers(req, documentId, collectionSlug)` — standalone function

Each standalone function calls `getPluginContext(req.payload.config)` internally to get slugs and config.

```ts
import type { PayloadRequest, Plugin } from 'payload';
import { attachPluginContext, getPluginContext } from './context';
import { markAllReadEndpoint } from './endpoints/mark-all-read';
import { markReadEndpoint } from './endpoints/mark-read';
import { subscribeEndpoint } from './endpoints/subscribe';
import { unreadCountEndpoint } from './endpoints/unread-count';
import { unsubscribeEndpoint } from './endpoints/unsubscribe';
import { Notifications, Subscriptions } from './entities';
import {
  createNotificationDoc,
  invokeCallback,
  sendNotificationEmail,
} from './helpers';
import type { NotificationsConfig, NotifyInput } from './types';
import { notifyInputSchema } from './types';

export type {
  NotificationEmailConfig,
  NotificationsConfig,
  NotifyInput,
} from './types';
export { notifyInputSchema } from './types';

// --- Plugin ---

export const notificationsPlugin = ({
  notificationsSlug = 'notifications',
  subscriptionsSlug = 'subscriptions',
  pollInterval = 30,
  email,
  onNotify,
}: NotificationsConfig = {}): Plugin => (config) => {
  attachPluginContext(config, {
    notificationsSlug,
    subscriptionsSlug,
    pollInterval,
    email,
    onNotify,
  });

  config.collections ??= [];
  config.collections.push(Notifications({ slug: notificationsSlug }));
  config.collections.push(Subscriptions({ slug: subscriptionsSlug }));

  addNotificationPreferences(config);

  config.endpoints ??= [];
  config.endpoints.push(
    markReadEndpoint(notificationsSlug),
    markAllReadEndpoint(notificationsSlug),
    unreadCountEndpoint(notificationsSlug),
    subscribeEndpoint(subscriptionsSlug),
    unsubscribeEndpoint(subscriptionsSlug),
  );

  config.admin ??= {};
  config.admin.components ??= {};
  const afterNavLinks = config.admin.components.afterNavLinks ?? [];
  afterNavLinks.push({
    path: 'payload-notifications/client#NotificationBell',
    clientProps: { pollInterval },
  });
  config.admin.components.afterNavLinks = afterNavLinks;

  return config;
};

// --- Standalone API functions ---

export async function notify(
  req: PayloadRequest,
  input: NotifyInput,
): Promise<void> {
  const ctx = getPluginContext(req.payload.config);
  const parsed = notifyInputSchema.parse(input);
  const userSlug = req.payload.config.admin?.user ?? 'users';

  const recipient = await req.payload.findByID({
    collection: userSlug,
    id: parsed.recipient,
    depth: 0,
  });

  const prefs = recipient.notificationPreferences as
    | { emailEnabled?: boolean; inAppEnabled?: boolean }
    | undefined;

  const isEmailEnabled = prefs?.emailEnabled !== false;
  const isInAppEnabled = prefs?.inAppEnabled !== false;
  const recipientEmail = recipient.email as string;

  if (isInAppEnabled) {
    await createNotificationDoc(req, ctx.notificationsSlug, parsed);
  }

  if (ctx.email && isEmailEnabled && recipientEmail) {
    await sendNotificationEmail(req, ctx.email, parsed, recipientEmail);
  }

  if (ctx.onNotify) {
    await invokeCallback(ctx.onNotify, req, parsed, recipientEmail);
  }
}

export async function subscribe(
  req: PayloadRequest,
  userId: string | number,
  documentId: string,
  collectionSlug: string,
  reason: 'manual' | 'auto' = 'auto',
): Promise<void> {
  const ctx = getPluginContext(req.payload.config);

  const existing = await req.payload.find({
    collection: ctx.subscriptionsSlug,
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
    collection: ctx.subscriptionsSlug,
    data: { user: userId, documentId, collectionSlug, reason },
    req,
  });
}

export async function unsubscribe(
  req: PayloadRequest,
  userId: string | number,
  documentId: string,
  collectionSlug: string,
): Promise<void> {
  const ctx = getPluginContext(req.payload.config);

  await req.payload.delete({
    collection: ctx.subscriptionsSlug,
    where: {
      and: [
        { user: { equals: userId } },
        { documentId: { equals: documentId } },
        { collectionSlug: { equals: collectionSlug } },
      ],
    },
    req,
  });
}

export async function getSubscribers(
  req: PayloadRequest,
  documentId: string,
  collectionSlug: string,
): Promise<(string | number)[]> {
  const ctx = getPluginContext(req.payload.config);

  const results = await req.payload.find({
    collection: ctx.subscriptionsSlug,
    where: {
      and: [
        { documentId: { equals: documentId } },
        { collectionSlug: { equals: collectionSlug } },
      ],
    },
    limit: 0,
    depth: 0,
  });

  return results.docs.map(
    (doc) =>
      (doc as unknown as Record<string, unknown>).user as string | number,
  );
}

// --- Internal helpers ---

function addNotificationPreferences(
  payloadConfig: Parameters<Plugin>[0],
): void {
  const usersCollection = payloadConfig.collections?.find(
    (c) => c.slug === payloadConfig.admin?.user,
  );
  if (!usersCollection) return;

  usersCollection.fields ??= [];
  usersCollection.fields.push({
    name: 'notificationPreferences',
    type: 'group',
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
```

**Step 2: Commit**

```bash
git add packages/notifications/src/index.ts
git commit -m "refactor(payload-notifications): replace factory with direct plugin export + standalone functions"
```

---

### Task 3: Update tests

**Files:**
- Modify: `packages/notifications/src/index.test.ts`

**Step 1: Rewrite tests for new API shape**

```ts
import { describe, expect, it } from 'vitest';
import { notificationsPlugin, notify, subscribe, unsubscribe, getSubscribers } from './index';

describe('notificationsPlugin', () => {
  it('should return a valid Payload plugin function', () => {
    const plugin = notificationsPlugin({});
    expect(plugin).toBeTypeOf('function');
  });

  it('should accept empty config', () => {
    const plugin = notificationsPlugin();
    expect(plugin).toBeTypeOf('function');
  });
});

describe('standalone API functions', () => {
  it('should export notify as a function', () => {
    expect(notify).toBeTypeOf('function');
  });

  it('should export subscribe as a function', () => {
    expect(subscribe).toBeTypeOf('function');
  });

  it('should export unsubscribe as a function', () => {
    expect(unsubscribe).toBeTypeOf('function');
  });

  it('should export getSubscribers as a function', () => {
    expect(getSubscribers).toBeTypeOf('function');
  });
});
```

**Step 2: Run tests**

```bash
cd packages/notifications && pnpm test
```

**Step 3: Commit**

```bash
git add packages/notifications/src/index.test.ts
git commit -m "test(payload-notifications): update tests for new API shape"
```

---

### Task 4: Update sandbox consumer code

**Files:**
- Modify: `sandbox/src/payload.config.ts`

**Step 1: Update imports and plugin usage**

Change from:
```ts
import { createNotifications } from 'payload-notifications';
const notifications = createNotifications({ email: { ... } });
// ...
notifications.plugin()
notifications.subscribe(...)
notifications.notify(...)
notifications.getSubscribers(...)
```

To:
```ts
import { notificationsPlugin, notify, subscribe, getSubscribers } from 'payload-notifications';
// ...
notificationsPlugin({ email: { ... } })
subscribe(req, ...)
notify(req, ...)
getSubscribers(req, ...)
```

**Step 2: Rebuild notifications plugin**

```bash
cd packages/notifications && pnpm build
```

**Step 3: Typecheck sandbox**

```bash
cd sandbox && pnpm typecheck
```

**Step 4: Commit**

```bash
git add sandbox/src/payload.config.ts
git commit -m "refactor(sandbox): update to new notifications plugin API"
```

---

### Task 5: Remove `NotificationsAPI` interface and clean up dead exports

**Files:**
- Modify: `packages/notifications/src/index.ts` (remove `NotificationsAPI`)

The `NotificationsAPI` interface was only needed for the factory return type. With standalone functions, each function's signature *is* the public API. Remove it.

Also verify no other file references `NotificationsAPI` or `createNotifications`.

**Step 1: Search and remove**

```bash
rg "NotificationsAPI\|createNotifications" packages/
```

Remove any remaining references.

**Step 2: Run all tests + typecheck**

```bash
cd packages/notifications && pnpm test && pnpm typecheck
cd sandbox && pnpm typecheck
```

**Step 3: Commit**

```bash
git commit -am "chore(payload-notifications): remove dead NotificationsAPI interface"
```

---

### Task 6: Final verification

**Step 1: Build the plugin**

```bash
cd packages/notifications && pnpm build
```

**Step 2: Run all tests across workspace**

```bash
pnpm -r test
```

**Step 3: Typecheck everything**

```bash
pnpm -r typecheck
```

**Step 4: Boot sandbox dev server**

```bash
cd sandbox && pnpm dev
```

Verify it boots without errors.
