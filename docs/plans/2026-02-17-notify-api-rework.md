# notify() API Rework — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rework the `notify()` public API to support dynamic subjects (three tiers), auto-resolve actor display names, and replace manual URL construction with a redirect endpoint.

**Architecture:** The subject field becomes JSON-typed to support static strings, write-time-resolved functions, and read-time-resolved live templates. A new `/open` endpoint replaces direct URL navigation, atomically marking notifications as read and redirecting. Actor display names are resolved internally using the user collection's `admin.useAsTitle`.

**Tech Stack:** TypeScript, Payload CMS 3.x, Vitest, Zod

**Design doc:** `docs/plans/2026-02-17-notify-api-rework-design.md`

---

### Task 1: Subject Types and `createLiveSubject`

Define the type system for the three subject tiers and implement the `createLiveSubject` builder.

**Files:**
- Modify: `packages/notifications/src/types.ts`
- Create: `packages/notifications/src/subject.ts`
- Create: `packages/notifications/src/subject.test.ts`

**Step 1: Write failing tests for `createLiveSubject`**

In `packages/notifications/src/subject.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createLiveSubject, isLiveSubject } from './subject';

describe('createLiveSubject', () => {
  it('should create a live subject with actor token', () => {
    const result = createLiveSubject((t) => t`${t.actor} commented`);
    expect(isLiveSubject(result)).toBe(true);
    expect(result.parts).toEqual([
      { type: 'actor', field: 'displayName' },
      ' commented',
    ]);
  });

  it('should create a live subject with document field token', () => {
    const result = createLiveSubject(
      (t) => t`${t.actor} commented on "${t.document('title')}"`,
    );
    expect(result.parts).toEqual([
      { type: 'actor', field: 'displayName' },
      ' commented on "',
      { type: 'document', field: 'title' },
      '"',
    ]);
  });

  it('should create a live subject with meta field token', () => {
    const result = createLiveSubject(
      (t) => t`Action on ${t.meta('itemName')}`,
    );
    expect(result.parts).toEqual([
      'Action on ',
      { type: 'meta', field: 'itemName' },
    ]);
  });

  it('should filter out empty string parts', () => {
    const result = createLiveSubject((t) => t`${t.actor}`);
    expect(result.parts).toEqual([{ type: 'actor', field: 'displayName' }]);
  });
});

describe('isLiveSubject', () => {
  it('should return false for a plain string', () => {
    expect(isLiveSubject('hello')).toBe(false);
  });

  it('should return false for a function', () => {
    expect(isLiveSubject(() => 'hello')).toBe(false);
  });

  it('should return true for a LiveSubject object', () => {
    const result = createLiveSubject((t) => t`${t.actor} did something`);
    expect(isLiveSubject(result)).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/notifications && pnpm test -- subject.test.ts`
Expected: FAIL — module `./subject` not found.

**Step 3: Implement `subject.ts`**

In `packages/notifications/src/subject.ts`:

```ts
const LIVE_SUBJECT_BRAND = Symbol.for('payload-notifications:live-subject');

export interface LiveSubjectToken {
  type: 'actor' | 'document' | 'meta';
  field: string;
}

export interface LiveSubject {
  readonly [LIVE_SUBJECT_BRAND]: true;
  readonly type: 'dynamic';
  readonly parts: ReadonlyArray<string | LiveSubjectToken>;
}

export function isLiveSubject(value: unknown): value is LiveSubject {
  return (
    typeof value === 'object' &&
    value !== null &&
    LIVE_SUBJECT_BRAND in value &&
    (value as LiveSubject)[LIVE_SUBJECT_BRAND] === true
  );
}

interface TemplateBuilder {
  (strings: TemplateStringsArray, ...tokens: LiveSubjectToken[]): LiveSubject;
  actor: LiveSubjectToken;
  document: (field: string) => LiveSubjectToken;
  meta: (field: string) => LiveSubjectToken;
}

export function createLiveSubject(
  fn: (t: TemplateBuilder) => LiveSubject,
): LiveSubject {
  const tag = ((
    strings: TemplateStringsArray,
    ...tokens: LiveSubjectToken[]
  ): LiveSubject => {
    const parts: (string | LiveSubjectToken)[] = [];

    for (let i = 0; i < strings.length; i++) {
      if (strings[i]) parts.push(strings[i]);
      if (i < tokens.length) parts.push(tokens[i]);
    }

    return {
      [LIVE_SUBJECT_BRAND]: true as const,
      type: 'dynamic' as const,
      parts,
    };
  }) as TemplateBuilder;

  tag.actor = { type: 'actor', field: 'displayName' };
  tag.document = (field: string) => ({ type: 'document', field });
  tag.meta = (field: string) => ({ type: 'meta', field });

  return fn(tag);
}
```

**Step 4: Run tests to verify they pass**

Run: `cd packages/notifications && pnpm test -- subject.test.ts`
Expected: All tests PASS.

**Step 5: Update types in `types.ts`**

In `packages/notifications/src/types.ts`, update the `NotifyInput` interface:

- Import `LiveSubject` from `./subject`.
- Add `SubjectContext` and `SubjectFn` types.
- Change `subject` from `string` to `string | SubjectFn | LiveSubject`.
- Make `actor` optional.
- Add `documentReference?: DocumentReference`.
- Remove `subscription` from the interface.

```ts
import type { LiveSubject } from './subject';

export interface SubjectContext {
  actor: { id: string | number; displayName: string };
  document?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export type SubjectFn = (context: SubjectContext) => string;

export interface NotifyInput {
  recipient: TypeWithID['id'];
  event: string;
  actor?: TypeWithID['id'];
  subject: string | SubjectFn | LiveSubject;
  documentReference?: DocumentReference;
  url?: string;
  meta?: Record<string, unknown>;
}
```

Remove the old `subscription` field from `NotifyInput`.

**Step 6: Update exports in `index.ts`**

Add to `packages/notifications/src/index.ts`:

```ts
export { createLiveSubject } from './subject';
export type { LiveSubject, SubjectFn, SubjectContext } from './types';
```

**Step 7: Run full test suite**

Run: `cd packages/notifications && pnpm test`
Expected: All tests PASS (existing tests still work since `notify` is only tested as an export).

**Step 8: Commit**

```bash
git add packages/notifications/src/subject.ts packages/notifications/src/subject.test.ts packages/notifications/src/types.ts packages/notifications/src/index.ts
git commit -m "feat(payload-notifications): add subject type system and createLiveSubject builder"
```

---

### Task 2: Actor Resolution Utility

Extract a reusable utility that resolves a user ID into `{ id, displayName }` using the user collection's `admin.useAsTitle`.

**Files:**
- Create: `packages/notifications/src/resolve-actor.ts`
- Create: `packages/notifications/src/resolve-actor.test.ts`

**Step 1: Write failing tests**

In `packages/notifications/src/resolve-actor.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { resolveActor } from './resolve-actor';

function mockPayload({
  useAsTitle = 'name',
  userData = { id: '1', name: 'Jane', email: 'jane@test.com' },
}: {
  useAsTitle?: string;
  userData?: Record<string, unknown>;
} = {}) {
  return {
    config: {
      admin: { user: 'users' },
    },
    collections: {
      users: { config: { admin: { useAsTitle } } },
    },
    findByID: vi.fn().mockResolvedValue(userData),
  };
}

describe('resolveActor', () => {
  it('should resolve display name from useAsTitle field', async () => {
    const payload = mockPayload();
    const result = await resolveActor(payload as any, '1');

    expect(result).toEqual({ id: '1', displayName: 'Jane' });
    expect(payload.findByID).toHaveBeenCalledWith({
      collection: 'users',
      id: '1',
      depth: 0,
    });
  });

  it('should fall back to email when useAsTitle field is missing', async () => {
    const payload = mockPayload({
      useAsTitle: 'nickname',
      userData: { id: '2', email: 'bob@test.com' },
    });
    const result = await resolveActor(payload as any, '2');

    expect(result).toEqual({ id: '2', displayName: 'bob@test.com' });
  });

  it('should fall back to email when useAsTitle value is not a string', async () => {
    const payload = mockPayload({
      useAsTitle: 'role',
      userData: { id: '3', role: 42, email: 'c@test.com' },
    });
    const result = await resolveActor(payload as any, '3');

    expect(result).toEqual({ id: '3', displayName: 'c@test.com' });
  });

  it('should use default useAsTitle of email when admin config is absent', async () => {
    const payload = mockPayload();
    payload.collections.users.config.admin = {} as any;
    const result = await resolveActor(payload as any, '1');

    expect(result).toEqual({ id: '1', displayName: 'jane@test.com' });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/notifications && pnpm test -- resolve-actor.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement `resolve-actor.ts`**

In `packages/notifications/src/resolve-actor.ts`:

```ts
import type { BasePayload, CollectionSlug, TypeWithID } from 'payload';

export interface ResolvedActor {
  id: TypeWithID['id'];
  displayName: string;
}

/**
 * Resolve a user ID into a display-name pair using the user collection's
 * `admin.useAsTitle` config. Falls back to `email` when the configured
 * field is missing or not a string.
 */
export async function resolveActor(
  payload: BasePayload,
  actorId: TypeWithID['id'],
): Promise<ResolvedActor> {
  const userSlug = payload.config.admin?.user as CollectionSlug | undefined;
  if (!userSlug) {
    return { id: actorId, displayName: String(actorId) };
  }

  const user = await payload.findByID({
    collection: userSlug,
    id: actorId,
    depth: 0,
  });

  const { useAsTitle = 'email' } =
    payload.collections[userSlug].config.admin ?? {};

  const titleValue = user[useAsTitle as keyof typeof user];
  const displayName =
    typeof titleValue === 'string' ? titleValue : (user.email as string);

  return { id: actorId, displayName };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd packages/notifications && pnpm test -- resolve-actor.test.ts`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add packages/notifications/src/resolve-actor.ts packages/notifications/src/resolve-actor.test.ts
git commit -m "feat(payload-notifications): add resolveActor utility"
```

---

### Task 3: Subject Resolution Utility

Implement `resolveSubject()` which handles all three subject tiers: static strings, SubjectFn (write-time), and LiveSubject (read-time).

**Files:**
- Create: `packages/notifications/src/resolve-subject.ts`
- Create: `packages/notifications/src/resolve-subject.test.ts`

**Step 1: Write failing tests**

In `packages/notifications/src/resolve-subject.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createLiveSubject } from './subject';
import {
  resolveSubjectAtWriteTime,
  resolveSubjectAtReadTime,
  toStoredSubject,
} from './resolve-subject';

describe('toStoredSubject', () => {
  it('should store a plain string as static', () => {
    const result = toStoredSubject('Hello', { actor: undefined });
    expect(result).toEqual({ type: 'static', value: 'Hello' });
  });

  it('should resolve a SubjectFn and store as static', () => {
    const fn = ({ actor }: any) => `${actor.displayName} commented`;
    const result = toStoredSubject(fn, {
      actor: { id: '1', displayName: 'Jane' },
    });
    expect(result).toEqual({ type: 'static', value: 'Jane commented' });
  });

  it('should pass document and meta to SubjectFn', () => {
    const fn = ({ actor, document, meta }: any) =>
      `${actor.displayName} did ${meta.action} on ${document.title}`;
    const result = toStoredSubject(fn, {
      actor: { id: '1', displayName: 'Jane' },
      document: { title: 'My Doc' },
      meta: { action: 'edit' },
    });
    expect(result).toEqual({
      type: 'static',
      value: 'Jane did edit on My Doc',
    });
  });

  it('should store a LiveSubject as dynamic', () => {
    const live = createLiveSubject((t) => t`${t.actor} commented`);
    const result = toStoredSubject(live, { actor: undefined });
    expect(result).toEqual({
      type: 'dynamic',
      parts: [{ type: 'actor', field: 'displayName' }, ' commented'],
    });
  });
});

describe('resolveSubjectAtReadTime', () => {
  it('should return the value for a static subject', () => {
    const result = resolveSubjectAtReadTime(
      { type: 'static', value: 'Hello' },
      {},
    );
    expect(result).toBe('Hello');
  });

  it('should resolve actor tokens in a dynamic subject', () => {
    const stored = {
      type: 'dynamic' as const,
      parts: [
        { type: 'actor' as const, field: 'displayName' },
        ' commented',
      ],
    };
    const result = resolveSubjectAtReadTime(stored, {
      actor: { id: '1', displayName: 'Jane' },
    });
    expect(result).toBe('Jane commented');
  });

  it('should resolve document tokens in a dynamic subject', () => {
    const stored = {
      type: 'dynamic' as const,
      parts: [
        { type: 'actor' as const, field: 'displayName' },
        ' edited "',
        { type: 'document' as const, field: 'title' },
        '"',
      ],
    };
    const result = resolveSubjectAtReadTime(stored, {
      actor: { id: '1', displayName: 'Jane' },
      document: { title: 'My Doc' },
    });
    expect(result).toBe('Jane edited "My Doc"');
  });

  it('should resolve meta tokens in a dynamic subject', () => {
    const stored = {
      type: 'dynamic' as const,
      parts: [
        'Action: ',
        { type: 'meta' as const, field: 'action' },
      ],
    };
    const result = resolveSubjectAtReadTime(stored, {
      meta: { action: 'deploy' },
    });
    expect(result).toBe('Action: deploy');
  });

  it('should use empty string for missing token data', () => {
    const stored = {
      type: 'dynamic' as const,
      parts: [
        { type: 'actor' as const, field: 'displayName' },
        ' did something',
      ],
    };
    const result = resolveSubjectAtReadTime(stored, {});
    expect(result).toBe(' did something');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/notifications && pnpm test -- resolve-subject.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement `resolve-subject.ts`**

In `packages/notifications/src/resolve-subject.ts`:

```ts
import type { LiveSubject, LiveSubjectToken } from './subject';
import { isLiveSubject } from './subject';
import type { SubjectContext, SubjectFn } from './types';

export interface StaticStoredSubject {
  type: 'static';
  value: string;
}

export interface DynamicStoredSubject {
  type: 'dynamic';
  parts: ReadonlyArray<string | LiveSubjectToken>;
}

export type StoredSubject = StaticStoredSubject | DynamicStoredSubject;

/**
 * Convert a subject input into the shape stored in the database.
 * - Plain strings and SubjectFn results become `{ type: 'static', value }`.
 * - LiveSubject objects become `{ type: 'dynamic', parts }`.
 */
export function toStoredSubject(
  subject: string | SubjectFn | LiveSubject,
  context: Partial<SubjectContext>,
): StoredSubject {
  if (isLiveSubject(subject)) {
    return { type: 'dynamic', parts: subject.parts };
  }

  if (typeof subject === 'function') {
    const value = subject(context as SubjectContext);
    return { type: 'static', value };
  }

  return { type: 'static', value: subject };
}

/**
 * Resolve a stored subject into a display string.
 * Static subjects return their value directly.
 * Dynamic subjects resolve each token against the provided context.
 */
export function resolveSubjectAtReadTime(
  stored: StoredSubject,
  context: Partial<SubjectContext>,
): string {
  if (stored.type === 'static') return stored.value;

  return stored.parts
    .map((part) => {
      if (typeof part === 'string') return part;
      return resolveToken(part, context);
    })
    .join('');
}

function resolveToken(
  token: LiveSubjectToken,
  context: Partial<SubjectContext>,
): string {
  switch (token.type) {
    case 'actor': {
      const value = context.actor?.[token.field as keyof typeof context.actor];
      return typeof value === 'string' ? value : '';
    }
    case 'document': {
      const value = context.document?.[token.field];
      return typeof value === 'string' ? value : '';
    }
    case 'meta': {
      const value = context.meta?.[token.field];
      return typeof value === 'string' ? value : String(value ?? '');
    }
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd packages/notifications && pnpm test -- resolve-subject.test.ts`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add packages/notifications/src/resolve-subject.ts packages/notifications/src/resolve-subject.test.ts
git commit -m "feat(payload-notifications): add subject resolution utilities"
```

---

### Task 4: Update Notifications Entity

Change the `subject` field from `text` to `json`, add the `documentReference` group field, and remove the old `documentId` field.

**Files:**
- Modify: `packages/notifications/src/entities.ts`

**Step 1: Update the Notifications entity**

In `packages/notifications/src/entities.ts`, in the `Notifications` factory:

- Change `{ name: 'subject', type: 'text', required: true }` to `{ name: 'subject', type: 'json', required: true }`.
- Remove `{ name: 'documentId', type: 'text' }`.
- Add the `documentReference` group field (same shape as the one on Subscriptions):

```ts
{
  name: 'documentReference',
  type: 'group',
  fields: [
    {
      name: 'entity',
      type: 'select',
      options: ['collection', 'global'],
    },
    { name: 'slug', type: 'text', index: true },
    { name: 'documentId', type: 'text', index: true },
  ],
},
```

**Step 2: Run full test suite**

Run: `cd packages/notifications && pnpm test`
Expected: All tests PASS.

**Step 3: Commit**

```bash
git add packages/notifications/src/entities.ts
git commit -m "feat(payload-notifications): update notification entity schema for subject and documentReference"
```

---

### Task 5: Rework `notify()` Function

Update `notify()` to resolve the actor, build the subject context, fetch the referenced document if needed, and store the resolved/live subject.

**Files:**
- Modify: `packages/notifications/src/api.ts`
- Modify: `packages/notifications/src/helpers.ts`

**Step 1: Update `helpers.ts`**

In `packages/notifications/src/helpers.ts`, update `createNotificationDoc` to accept the new stored subject shape and `documentReference`:

- Change the `subject` field from `input.subject` to the stored subject JSON.
- Add `documentReference` to the created doc.
- Accept `StoredSubject` and the resolved subject string separately (for email/callback which still need a plain string).

The function signature becomes:

```ts
export async function createNotificationDoc(
  req: PayloadRequest,
  notificationsSlug: CollectionSlug,
  data: {
    recipient: string;
    event: string;
    actor?: string;
    subject: StoredSubject;
    url?: string;
    meta?: Record<string, unknown>;
    documentReference?: StoredDocumentReference;
  },
): Promise<void> {
  await req.payload.create({
    collection: notificationsSlug as 'notifications',
    data: {
      recipient: data.recipient,
      event: data.event,
      actor: data.actor as string,
      subject: data.subject,
      url: data.url,
      meta: data.meta,
      documentReference: data.documentReference,
    },
    req,
  });
}
```

Update `sendNotificationEmail` and `invokeCallback` to accept a resolved subject string instead of the raw `NotifyInput`:

```ts
export async function sendNotificationEmail(
  req: PayloadRequest,
  emailConfig: NotificationEmailConfig,
  notification: { subject: string; recipient: string; event: string },
  recipientEmail: string,
): Promise<void> { ... }
```

**Step 2: Rewrite `notify()` in `api.ts`**

```ts
export async function notify(
  req: PayloadRequest,
  input: NotifyInput,
): Promise<void> {
  const ctx = getPluginContext(req.payload.config);
  if (!req.payload.config.admin?.user) return;

  // Resolve actor display name
  const resolvedActor = input.actor
    ? await resolveActor(req.payload, input.actor)
    : undefined;

  // Fetch referenced document if needed
  const document = input.documentReference
    ? await fetchDocumentByReference(req.payload, input.documentReference)
    : undefined;

  // Build subject context and resolve subject
  const subjectContext: Partial<SubjectContext> = {
    actor: resolvedActor,
    document: document ?? undefined,
    meta: input.meta,
  };
  const storedSubject = toStoredSubject(input.subject, subjectContext);

  // Resolve display string for email/callback
  const resolvedSubjectString =
    storedSubject.type === 'static'
      ? storedSubject.value
      : resolveSubjectAtReadTime(storedSubject, subjectContext);

  // Build stored document reference
  const storedRef = input.documentReference
    ? toStoredReference(input.documentReference)
    : undefined;

  // Fetch recipient
  const recipient = await req.payload.findByID({
    collection: req.payload.config.admin.user as 'users',
    id: input.recipient,
    depth: 0,
  });

  if (recipient.notificationPreferences?.inAppEnabled) {
    await createNotificationDoc(req, ctx.collectionSlugs.notifications, {
      recipient: input.recipient as string,
      event: input.event,
      actor: input.actor as string | undefined,
      subject: storedSubject,
      url: input.url,
      meta: input.meta,
      documentReference: storedRef,
    });
  }

  if (ctx.email && recipient.notificationPreferences?.emailEnabled) {
    await sendNotificationEmail(
      req,
      ctx.email,
      { subject: resolvedSubjectString, recipient: input.recipient as string, event: input.event },
      recipient.email,
    );
  }

  if (ctx.onNotify) {
    await invokeCallback(ctx.onNotify, req, {
      subject: resolvedSubjectString,
      recipient: input.recipient as string,
      event: input.event,
    }, recipient.email);
  }
}
```

**Step 3: Run full test suite**

Run: `cd packages/notifications && pnpm test`
Expected: All tests PASS.

**Step 4: Commit**

```bash
git add packages/notifications/src/api.ts packages/notifications/src/helpers.ts
git commit -m "feat(payload-notifications): rework notify() to resolve actor, subject, and documentReference"
```

---

### Task 6: Redirect Endpoint (`/open`)

Add the `GET /api/notifications-plugin/open?id=...` endpoint that marks a notification as read and redirects to the appropriate URL.

**Files:**
- Create: `packages/notifications/src/endpoints/open-notification.ts`
- Modify: `packages/notifications/src/procedures.ts`
- Modify: `packages/notifications/src/index.ts` (register endpoint)

**Step 1: Add the procedure definition**

In `packages/notifications/src/procedures.ts`, add:

```ts
openNotification: defineProcedure({
  path: '/notifications-plugin/open',
  method: 'get',
  input: markReadSchema,
}).returns<void>(),
```

**Step 2: Implement the endpoint**

In `packages/notifications/src/endpoints/open-notification.ts`:

```ts
import type { CollectionSlug } from 'payload';
import { getAdminURL } from '@repo/common';
import { ENDPOINTS } from '@/procedures';

export const openNotificationEndpoint = (notificationsSlug: CollectionSlug) =>
  ENDPOINTS.openNotification.endpoint(async (req, { id }) => {
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notification = await req.payload.findByID({
      collection: notificationsSlug as 'notifications',
      id,
      depth: 0,
      req,
    });

    // Verify ownership
    const recipientId =
      typeof notification.recipient === 'object'
        ? notification.recipient.id
        : notification.recipient;

    if (String(recipientId) !== String(req.user.id)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Mark as read
    if (!notification.readAt) {
      await req.payload.update({
        collection: notificationsSlug as 'notifications',
        id,
        data: { readAt: new Date().toISOString() },
        req,
      });
    }

    // Determine redirect URL
    let redirectUrl: string;

    if (notification.url) {
      // Explicit URL override wins
      redirectUrl = notification.url;
    } else if (
      notification.documentReference?.entity &&
      notification.documentReference?.slug
    ) {
      // Derive from document reference
      const ref = notification.documentReference;
      const path =
        ref.entity === 'collection' && ref.documentId
          ? `/collections/${ref.slug}/${ref.documentId}`
          : `/globals/${ref.slug}`;
      redirectUrl = getAdminURL({ req, path: path as `/${string}` });
    } else {
      // Fallback to admin root
      redirectUrl = getAdminURL({ req, path: '' });
    }

    return Response.redirect(redirectUrl, 302);
  });
```

**Step 3: Register the endpoint in `index.ts`**

In `packages/notifications/src/index.ts`, import and add the endpoint:

```ts
import { openNotificationEndpoint } from './endpoints/open-notification';

// In the endpoints array:
config.endpoints.push(
  // ... existing endpoints ...
  openNotificationEndpoint(notifSlug),
);
```

**Step 4: Run full test suite**

Run: `cd packages/notifications && pnpm test`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add packages/notifications/src/endpoints/open-notification.ts packages/notifications/src/procedures.ts packages/notifications/src/index.ts
git commit -m "feat(payload-notifications): add /open redirect endpoint"
```

---

### Task 7: Update Client Components

Update `NotificationItem` to use the `/open` endpoint for navigation and to handle the new JSON subject format. Update `NotificationBell` to resolve live subjects when fetching the notification list.

**Files:**
- Modify: `packages/notifications/src/components/NotificationItem.tsx`
- Modify: `packages/notifications/src/components/NotificationBell.tsx`

**Step 1: Update `NotificationData` interface**

In `NotificationItem.tsx`, update the `NotificationData` interface:

```ts
import type { StoredDocumentReference } from '@/types';
import type { StoredSubject } from '@/resolve-subject';

export interface NotificationData {
  id: string | number;
  event: string;
  subject: StoredSubject;
  resolvedSubject: string; // pre-resolved for display
  url?: string | null;
  readAt?: string | null;
  documentReference?: StoredDocumentReference | null;
  createdAt: string;
}
```

**Step 2: Update `NotificationItem` navigation**

Replace `router.push(notification.url)` with navigation to the open endpoint:

```ts
const handleClick = () => {
  // Navigate via the open endpoint — it marks as read and redirects
  window.location.href = `${apiRoute}/notifications-plugin/open?id=${notification.id}`;
};
```

Remove the `onMarkRead` call from `handleClick` since the endpoint handles it. Update the `onClose` prop usage accordingly.

Display the subject using `notification.resolvedSubject` instead of `notification.subject`.

**Step 3: Update `NotificationBell` to resolve subjects**

In `NotificationBell.tsx`, after fetching notifications, resolve subjects client-side for static ones and defer dynamic ones to a new endpoint or resolve them server-side.

For simplicity, add a lightweight fetch wrapper that requests notifications with resolved subjects. The notification list REST endpoint (`/api/notifications?...`) returns raw docs. Add a small mapping step:

```ts
import { resolveSubjectAtReadTime } from '@/resolve-subject';

// After fetching raw notification docs:
const mapped = data.docs.map((doc) => ({
  ...doc,
  resolvedSubject:
    typeof doc.subject === 'string'
      ? doc.subject // backward compat
      : doc.subject.type === 'static'
        ? doc.subject.value
        : doc.subject.value ?? '...', // dynamic subjects need server resolution
}));
```

Note: Full dynamic subject resolution on the client requires actor/document data. For now, store a `fallbackValue` on dynamic subjects at write time (the resolved string at creation) so the client always has something to display. This avoids N+1 queries on the client. The live resolution can be deferred to a future enhancement.

**Step 4: Remove unused `onMarkRead` from click handler**

Since the `/open` endpoint handles mark-as-read, the `handleClick` no longer needs to call `onMarkRead`. Keep `onMarkRead` in the context menu for the "Mark as read" action item.

**Step 5: Run type check**

Run: `cd packages/notifications && pnpm check:types`
Expected: No errors.

**Step 6: Commit**

```bash
git add packages/notifications/src/components/NotificationItem.tsx packages/notifications/src/components/NotificationBell.tsx
git commit -m "feat(payload-notifications): update client components for new subject format and /open endpoint"
```

---

### Task 8: Update Sandbox Consumer

Update the discussions `onComment` callback in the sandbox config to use the new `notify()` API shape.

**Files:**
- Modify: `sandbox/src/payload.config.ts`

**Step 1: Update the `notify()` call**

Remove `url` construction and `collectionSlug`/`documentId` references. The new call:

```ts
await notify(req, {
  recipient: recipientId,
  event,
  actor: authorId,
  subject: ({ actor }) =>
    parentComment
      ? `${actor.displayName} replied to a comment`
      : `${actor.displayName} commented on a document`,
  documentReference,
});
```

**Step 2: Verify type check**

Run: `cd sandbox && pnpm check:types` (or the equivalent)
Expected: No errors.

**Step 3: Commit**

```bash
git add sandbox/src/payload.config.ts
git commit -m "feat(sandbox): update notify() call to new API shape"
```

---

### Task 9: Regenerate Types and Final Verification

**Files:**
- Modify: `packages/notifications/src/payload-types.ts`
- Modify: `sandbox/src/payload-types.ts`

**Step 1: Regenerate Payload types**

Run: `cd packages/notifications && pnpm generate:types`
Run: `cd sandbox && pnpm generate:types`

**Step 2: Run full test suite across workspace**

Run: `pnpm test` (from workspace root)
Expected: All tests PASS.

**Step 3: Run type check across workspace**

Run: `pnpm check:types` (from workspace root, or per-package)
Expected: No errors.

**Step 4: Run lint**

Run: `pnpm lint`
Expected: No new errors.

**Step 5: Commit**

```bash
git add packages/notifications/src/payload-types.ts sandbox/src/payload-types.ts
git commit -m "chore: regenerate payload types after notify() API rework"
```
