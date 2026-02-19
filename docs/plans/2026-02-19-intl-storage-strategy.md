# Intl Plugin: Dual Storage Strategy — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the file-upload-only message storage with a configurable `'db' | 'upload'` strategy, defaulting to `'db'` (JSON field) to fix Next.js build failures.

**Architecture:** The plugin gains a `storage` config option. When `'db'`, messages are stored in a `data` JSON field on the collection document — `fetchMessages` becomes a single DB query. When `'upload'`, current file-based behavior is preserved. An auto-migration hook converts existing documents when switching strategies.

**Tech Stack:** Payload CMS v3, TypeScript, Zod, vitest

---

## Reference: Key Existing Files

| File | Purpose |
|------|---------|
| `plugins/intl/src/index.ts` | Plugin entry, `MessagesPluginConfig` interface |
| `plugins/intl/src/types.ts` | Type definitions |
| `plugins/intl/src/entities.ts` | `Messages` collection factory |
| `plugins/intl/src/const.ts` | Endpoint procedure definitions |
| `plugins/intl/src/hooks.ts` | Collection hooks wrapper |
| `plugins/intl/src/utils/config.ts` | Plugin context (stored in `config.custom`) |
| `plugins/intl/src/endpoints/get-messages.ts` | GET endpoint (to delete) |
| `plugins/intl/src/endpoints/set-messages.ts` | PUT endpoint |
| `plugins/intl/src/requests/fetchMessages.ts` | Main fetch export with overloads |
| `plugins/intl/src/requests/fetchMessageFromPayload.ts` | Server-side fetch via URL |
| `plugins/intl/src/requests/fetchMessageFromAPI.ts` | API fetch (to delete) |
| `plugins/intl/src/components/MessagesView.tsx` | Admin server component |
| `plugins/intl/src/components/hooks/useMessagesFormSubmit.ts` | Admin form submit hook |

---

### Task 1: Update Plugin Context to Include Storage Strategy

**Files:**
- Modify: `plugins/intl/src/utils/config.ts`
- Modify: `plugins/intl/src/utils/config.test.ts`

**Step 1: Write failing test for storage in plugin context**

Add to `plugins/intl/src/utils/config.test.ts`:

```typescript
import { describe, expect, test } from 'vitest';
import { attachPluginContext, getPluginContext, getSupportedLocales } from './config';

// ... existing getSupportedLocales tests ...

describe('pluginContext', () => {
  test('stores and retrieves storage strategy', () => {
    const config = { custom: {} } as any;
    attachPluginContext(config, { collectionSlug: 'messages', storage: 'db' });
    const ctx = getPluginContext({ custom: config.custom } as any);
    expect(ctx.storage).toBe('db');
  });

  test('stores upload storage strategy', () => {
    const config = { custom: {} } as any;
    attachPluginContext(config, { collectionSlug: 'messages', storage: 'upload' });
    const ctx = getPluginContext({ custom: config.custom } as any);
    expect(ctx.storage).toBe('upload');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd plugins/intl && pnpm test -- config.test.ts`
Expected: FAIL — `storage` not recognized in schema

**Step 3: Update config.ts to include storage**

In `plugins/intl/src/utils/config.ts`, update the schema and type:

```typescript
import type { Config, SanitizedConfig } from 'payload';
import { z } from 'zod/v4-mini';
import type { Locale } from '../types';

export const getSupportedLocales = (
  localization: Config['localization'],
): Locale[] => {
  if (!localization) {
    return [];
  }
  if (localization.locales.length === 0) {
    return [localization.defaultLocale];
  }
  return localization.locales.map((locale) => {
    if (typeof locale === 'string') {
      return locale;
    }
    return locale.code;
  });
};

const PLUGIN_KEY = 'intl-plugin';
const pluginContextSchema = z.object({
  collectionSlug: z.string(),
  storage: z.enum(['db', 'upload']),
});
type PluginContext = z.infer<typeof pluginContextSchema>;

export const attachPluginContext = (config: Config, context: PluginContext) => {
  config.custom ??= {};
  config.custom[PLUGIN_KEY] = context;
};

export const getPluginContext = (config: SanitizedConfig): PluginContext =>
  pluginContextSchema.parse(config.custom?.[PLUGIN_KEY]);
```

**Step 4: Run test to verify it passes**

Run: `cd plugins/intl && pnpm test -- config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add plugins/intl/src/utils/config.ts plugins/intl/src/utils/config.test.ts
git commit -m "feat(payload-intl): add storage strategy to plugin context"
```

---

### Task 2: Update Collection Factory for Dual Strategy

**Files:**
- Modify: `plugins/intl/src/entities.ts`
- Modify: `plugins/intl/src/types.ts`

**Step 1: Add StorageStrategy type to types.ts**

In `plugins/intl/src/types.ts`, add:

```typescript
export type StorageStrategy = 'db' | 'upload';
```

**Step 2: Update entities.ts to branch on storage**

Replace `plugins/intl/src/entities.ts`:

```typescript
import { createCollectionConfigFactory } from '@davincicoding/payload-plugin-kit';
import { getMessagesEndpoint } from './endpoints/get-messages';
import { setMessagesEndpoint } from './endpoints/set-messages';
import { createHooks } from './hooks';
import type { ResolvedPluginOptions } from './types';

export const Messages = createCollectionConfigFactory<
  ResolvedPluginOptions<'hooks' | 'storage'>
>(({ hooks, storage }) => ({
  admin: {
    hidden: true,
  },
  access: {
    read: () => true,
  },
  endpoints: [setMessagesEndpoint],
  fields: [
    {
      name: 'locale',
      type: 'text',
      required: true,
    },
    ...(storage === 'db'
      ? [
          {
            name: 'data',
            type: 'json' as const,
            required: true,
          },
        ]
      : []),
  ],
  hooks: createHooks(hooks),
  indexes: [
    {
      fields: ['locale'],
    },
  ],
  ...(storage === 'upload'
    ? {
        upload: {
          mimeTypes: ['application/json'],
        },
      }
    : {}),
}));
```

Note: `getMessagesEndpoint` import removed; only `setMessagesEndpoint` remains.

**Step 3: Update ResolvedPluginOptions**

The `ResolvedPluginOptions` type in `types.ts` already picks from `MessagesPluginConfig`. Since we add `storage` to `MessagesPluginConfig` in Task 3, this will resolve automatically via the generic. Verify by checking that `ResolvedPluginOptions<'storage'>` compiles after Task 3.

**Step 4: Run typecheck**

Run: `cd plugins/intl && pnpm typecheck`
Expected: May have errors referencing deleted endpoint — these resolve in later tasks.

**Step 5: Commit**

```bash
git add plugins/intl/src/entities.ts plugins/intl/src/types.ts
git commit -m "feat(payload-intl): support dual storage strategy in collection factory"
```

---

### Task 3: Update Plugin Entry with Storage Config

**Files:**
- Modify: `plugins/intl/src/index.ts`

**Step 1: Add storage to MessagesPluginConfig and wire it through**

```typescript
import type { Plugin } from 'payload';
import type { MessagesViewProps } from './components/MessagesView';
import { setMessagesEndpoint } from './endpoints/set-messages';
import { Messages } from './entities';
import type {
  MessagesGuard,
  MessagesHooks,
  MessagesSchema,
  StorageStrategy,
} from './types.ts';
import { attachPluginContext, getSupportedLocales } from './utils/config';

export interface MessagesPluginConfig {
  schema: MessagesSchema;
  /**
   * The slug of the collection to use for the messages.
   *
   * @default `messages`
   */
  collectionSlug?: string;
  /**
   * Access control for allowing to edit the messages.
   *
   * @default `(req) => req.user !== null // Authenticated users only`
   */
  editorAccess?: MessagesGuard;
  hooks?: MessagesHooks;
  tabs?: boolean;
  /**
   * Where to store the message content.
   *
   * - `'db'` — stores messages as a JSON field on the collection document.
   *   Single DB query to read. Works at build time. Default.
   * - `'upload'` — stores messages as uploaded JSON files via Payload's
   *   upload system. Requires reachable storage at read time.
   *
   * @default 'db'
   */
  storage?: StorageStrategy;
}

export const intlPlugin =
  ({
    schema,
    tabs,
    collectionSlug = 'messages',
    hooks = {},
    editorAccess = (req) => req.user !== null,
    storage = 'db',
  }: MessagesPluginConfig): Plugin =>
  (config) => {
    if (!config.localization) {
      console.warn(
        '[payload-intl] You have not set the localization option in your Payload config, so this plugin will have no effect.',
      );
      return config;
    }

    const locales = getSupportedLocales(config.localization);

    config.admin ??= {};
    config.admin.components ??= {};
    config.admin.components.actions ??= [];
    config.admin.components.actions.push({
      exportName: 'MessagesLink',
      path: 'payload-intl/rsc#MessagesLink',
    });

    config.admin.components.views = {
      ...config.admin.components.views,
      intl: {
        Component: {
          path: 'payload-intl/rsc#MessagesView',
          serverProps: {
            access: editorAccess,
            locales,
            schema,
            tabs,
          } satisfies MessagesViewProps,
        },
        path: '/intl',
      },
    };

    attachPluginContext(config, {
      collectionSlug,
      storage,
    });

    config.collections ??= [];
    config.collections.push(Messages({ slug: collectionSlug, hooks, storage }));

    config.endpoints ??= [];
    config.endpoints.push(setMessagesEndpoint);

    return config;
  };

export { fetchMessages } from './requests/fetchMessages';

export type {
  Messages,
  MessagesSchema,
  StorageStrategy,
} from './types.ts';
```

Key changes:
- Added `storage` param with default `'db'`
- Pass `storage` to `attachPluginContext` and `Messages` factory
- Only push `setMessagesEndpoint` (not `getMessagesEndpoint`)
- Export `StorageStrategy` type

**Step 2: Commit**

```bash
git add plugins/intl/src/index.ts
git commit -m "feat(payload-intl): add storage option to plugin config"
```

---

### Task 4: Delete GET Endpoint and API Fetch

**Files:**
- Delete: `plugins/intl/src/endpoints/get-messages.ts`
- Delete: `plugins/intl/src/requests/fetchMessageFromAPI.ts`
- Modify: `plugins/intl/src/const.ts`

**Step 1: Delete files**

```bash
rm plugins/intl/src/endpoints/get-messages.ts
rm plugins/intl/src/requests/fetchMessageFromAPI.ts
```

**Step 2: Remove getMessages from const.ts**

Update `plugins/intl/src/const.ts`:

```typescript
import { defineProcedure } from '@davincicoding/payload-plugin-kit';
import type { Messages } from './types';

export const ENDPOINTS = {
  setMessages: defineProcedure({
    path: '/intl-plugin',
    method: 'put',
  }).returns<{ success: boolean }>(),
};
```

**Step 3: Commit**

```bash
git add -A plugins/intl/src/endpoints/get-messages.ts plugins/intl/src/requests/fetchMessageFromAPI.ts plugins/intl/src/const.ts
git commit -m "refactor(payload-intl): remove GET endpoint and API fetch path"
```

---

### Task 5: Update fetchMessages — Single Signature, Dual Strategy

**Files:**
- Modify: `plugins/intl/src/requests/fetchMessages.ts`
- Modify: `plugins/intl/src/requests/fetchMessageFromPayload.ts`

**Step 1: Write failing test for DB fetch**

Create `plugins/intl/src/requests/fetchMessages.test.ts`:

```typescript
import { describe, expect, test, vi } from 'vitest';

vi.mock('../utils/config', () => ({
  getPluginContext: vi.fn(),
}));

import { getPluginContext } from '../utils/config';

describe('fetchMessagesFromPayload', () => {
  test('returns data field directly for db strategy', async () => {
    const mockMessages = { common: { hello: 'Hello' } };
    const mockPayload = {
      find: vi.fn().mockResolvedValue({
        docs: [{ locale: 'en', data: mockMessages }],
      }),
      config: {},
    };

    vi.mocked(getPluginContext).mockReturnValue({
      collectionSlug: 'messages',
      storage: 'db',
    });

    const { fetchMessagesFromPayload } = await import(
      './fetchMessageFromPayload'
    );
    const result = await fetchMessagesFromPayload(mockPayload as any, 'en');
    expect(result).toEqual(mockMessages);
  });

  test('returns empty object when no doc found', async () => {
    const mockPayload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      config: {},
    };

    vi.mocked(getPluginContext).mockReturnValue({
      collectionSlug: 'messages',
      storage: 'db',
    });

    const { fetchMessagesFromPayload } = await import(
      './fetchMessageFromPayload'
    );
    const result = await fetchMessagesFromPayload(mockPayload as any, 'en');
    expect(result).toEqual({});
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd plugins/intl && pnpm test -- fetchMessages.test.ts`
Expected: FAIL

**Step 3: Rewrite fetchMessageFromPayload.ts**

```typescript
import type { BasePayload } from 'payload';
import { getPluginContext } from '@/utils/config';
import { getErrorMessage } from '@/utils/error-handling';

export async function fetchMessagesFromPayload(
  payload: BasePayload,
  locale: string,
) {
  const { collectionSlug, storage } = getPluginContext(payload.config);

  const {
    docs: [doc],
  } = await payload.find({
    collection: collectionSlug as 'messages',
    where: { locale: { equals: locale } },
  });

  if (!doc) {
    console.warn(`No messages found for locale ${locale}`);
    return {};
  }

  if (storage === 'db') {
    return (doc as unknown as { data: Record<string, unknown> }).data;
  }

  const { url } = doc as unknown as { url: string };

  console.debug(`PAYLOAD_INTL: Fetching messages from storage: ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    const error = await getErrorMessage(response);
    throw new Error(
      `Could not fetch messages for locale "${locale}": ${error}`,
    );
  }

  if (response.headers.get('content-type') !== 'application/json') {
    throw new Error(
      `Could not fetch messages for locale "${locale}": The page did not return a JSON file.`,
    );
  }

  return await response.json();
}
```

**Step 4: Simplify fetchMessages.ts — single signature**

```typescript
import type { BasePayload } from 'payload';
import type { Messages } from '../types';
import { fetchMessagesFromPayload } from './fetchMessageFromPayload';

export async function fetchMessages(
  payload: BasePayload,
  locale: string,
): Promise<Messages> {
  return fetchMessagesFromPayload(payload, locale);
}
```

**Step 5: Run test to verify it passes**

Run: `cd plugins/intl && pnpm test -- fetchMessages.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add plugins/intl/src/requests/
git commit -m "feat(payload-intl): fetchMessages supports db and upload strategies"
```

---

### Task 6: Update set-messages Endpoint for Dual Strategy

**Files:**
- Modify: `plugins/intl/src/endpoints/set-messages.ts`

**Step 1: Rewrite set-messages.ts to branch on storage**

```typescript
import type { Endpoint, File, PayloadRequest } from 'payload';
import { ENDPOINTS } from '@/const';
import type { Messages, Translations } from '@/types';
import { getPluginContext, getSupportedLocales } from '@/utils/config';

export const setMessagesEndpoint: Endpoint = ENDPOINTS.setMessages.endpoint(
  async (req: PayloadRequest) => {
    const { user } = await req.payload.auth({ headers: req.headers });
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = (await req.json?.()) as Translations<Messages> | undefined;
    if (!data) {
      return Response.json({ error: 'No data provided' }, { status: 400 });
    }

    const supportedLocales = getSupportedLocales(
      req.payload.config.localization,
    );
    const { collectionSlug, storage } = getPluginContext(req.payload.config);

    for (const locale of supportedLocales) {
      const messages = data[locale];
      if (!messages) continue;

      if (storage === 'db') {
        const { docs } = await req.payload.update({
          collection: collectionSlug as 'messages',
          data: { data: messages },
          where: { locale: { equals: locale } },
        });
        if (docs.length === 0) {
          await req.payload.create({
            collection: collectionSlug as 'messages',
            data: { locale, data: messages },
          });
        }
      } else {
        const rawFile = new File(
          [JSON.stringify(messages)],
          `${locale}-${Date.now()}.json`,
          {
            type: 'application/json',
          },
        );

        const file: File = {
          name: rawFile.name,
          data: Buffer.from(await rawFile.arrayBuffer()),
          mimetype: rawFile.type,
          size: rawFile.size,
        };

        const { docs } = await req.payload.update({
          collection: collectionSlug as 'messages',
          data: {},
          file,
          where: { locale: { equals: locale } },
        });
        if (docs.length === 0) {
          await req.payload.create({
            collection: collectionSlug as 'messages',
            data: { locale },
            file,
          });
        }
      }
    }

    return { success: true };
  },
);
```

**Step 2: Commit**

```bash
git add plugins/intl/src/endpoints/set-messages.ts
git commit -m "feat(payload-intl): set-messages endpoint supports db and upload strategies"
```

---

### Task 7: Update Admin UI — Remove GET Endpoint URL

**Files:**
- Modify: `plugins/intl/src/components/MessagesView.tsx`

**Step 1: Remove endpointUrl construction from MessagesView**

The `MessagesView` currently constructs an `endpointUrl` for the GET endpoint and passes it to `MessagesForm`. Since the GET endpoint is removed, update to only pass the PUT endpoint URL.

Check if `endpointUrl` in `MessagesForm` is used only for the PUT submit. If so, keep passing the PUT URL. The `endpointUrl` was `${apiUrl}/intl-plugin` — which is already the PUT path.

Looking at `useMessagesFormSubmit.ts`:
```typescript
const response = await fetch(endpointUrl, {
  method: 'PUT',
  ...
});
```

The PUT endpoint path is `/intl-plugin` (same base path). So the `endpointUrl` construction in `MessagesView.tsx` already points to the right place. The only change needed is removing the now-unused import of `fetchMessages` if `MessagesView` still uses it for initial load — but it does use `fetchMessages(payload, loc)` to load translations, which still works.

Review and verify: `MessagesView.tsx` line 14 imports `fetchMessages` and line 52 calls `fetchMessages(payload, loc)`. This still works with the single-signature version. No changes needed here beyond verifying it compiles.

**Step 2: Run typecheck**

Run: `cd plugins/intl && pnpm typecheck`
Expected: PASS (or identify remaining issues)

**Step 3: Commit (if changes were needed)**

```bash
git add plugins/intl/src/components/
git commit -m "refactor(payload-intl): update admin UI for removed GET endpoint"
```

---

### Task 8: Add Auto-Migration Hook

**Files:**
- Create: `plugins/intl/src/migration.ts`
- Modify: `plugins/intl/src/index.ts`

**Step 1: Write the migration utility**

Create `plugins/intl/src/migration.ts`:

```typescript
import type { BasePayload } from 'payload';
import type { StorageStrategy } from './types';
import { getPluginContext } from './utils/config';

/**
 * Detects documents stored in a format that does not match the
 * current storage strategy and migrates them.
 *
 * - upload -> db: fetches each file URL, writes content to the data field.
 * - db -> upload: serializes the data field to a JSON file and uploads it.
 */
export async function migrateStorageStrategy(
  payload: BasePayload,
): Promise<void> {
  const { collectionSlug, storage } = getPluginContext(payload.config);

  const { docs } = await payload.find({
    collection: collectionSlug as 'messages',
    limit: 100,
  });

  if (docs.length === 0) return;

  for (const doc of docs) {
    const record = doc as unknown as {
      id: string;
      locale: string;
      data?: Record<string, unknown>;
      url?: string;
    };

    if (storage === 'db' && !record.data && record.url) {
      // Migrate upload -> db: fetch file, store in data field
      try {
        console.debug(
          `PAYLOAD_INTL: Migrating locale "${record.locale}" from upload to db`,
        );
        const response = await fetch(record.url);
        if (!response.ok) {
          console.error(
            `PAYLOAD_INTL: Failed to fetch ${record.url} during migration`,
          );
          continue;
        }
        const data = await response.json();
        await payload.update({
          collection: collectionSlug as 'messages',
          id: record.id,
          data: { data },
        });
      } catch (error) {
        console.error(
          `PAYLOAD_INTL: Migration failed for locale "${record.locale}":`,
          error,
        );
      }
    } else if (storage === 'upload' && record.data && !record.url) {
      // Migrate db -> upload: serialize data to file
      try {
        console.debug(
          `PAYLOAD_INTL: Migrating locale "${record.locale}" from db to upload`,
        );
        const rawFile = new File(
          [JSON.stringify(record.data)],
          `${record.locale}-${Date.now()}.json`,
          { type: 'application/json' },
        );
        const file = {
          name: rawFile.name,
          data: Buffer.from(await rawFile.arrayBuffer()),
          mimetype: rawFile.type,
          size: rawFile.size,
        };
        await payload.update({
          collection: collectionSlug as 'messages',
          id: record.id,
          data: {},
          file,
        });
      } catch (error) {
        console.error(
          `PAYLOAD_INTL: Migration failed for locale "${record.locale}":`,
          error,
        );
      }
    }
  }
}
```

**Step 2: Register migration in plugin entry**

In `plugins/intl/src/index.ts`, add an `onInit` hook:

```typescript
// Add to the plugin function, after pushing endpoints:
config.onInit = async (payload) => {
  const originalOnInit = config.onInit;
  if (originalOnInit) {
    await originalOnInit(payload);
  }
  await migrateStorageStrategy(payload);
};
```

Note: Be careful to preserve any existing `onInit`. The pattern is to
wrap the existing one. Actually, since Payload's `onInit` is a single
function (not an array), chain them:

```typescript
// In the plugin function body, before return config:
const existingOnInit = config.onInit;
config.onInit = async (payload) => {
  if (existingOnInit) await existingOnInit(payload);
  const { migrateStorageStrategy } = await import('./migration');
  await migrateStorageStrategy(payload);
};
```

**Step 3: Commit**

```bash
git add plugins/intl/src/migration.ts plugins/intl/src/index.ts
git commit -m "feat(payload-intl): add auto-migration between storage strategies"
```

---

### Task 9: Run Full Test Suite and Typecheck

**Files:** None (verification only)

**Step 1: Run typecheck**

Run: `cd plugins/intl && pnpm typecheck`
Expected: PASS — no type errors

**Step 2: Run all tests**

Run: `cd plugins/intl && pnpm test`
Expected: All tests pass

**Step 3: Fix any failures**

Address any test or type errors found. Common issues:
- Tests importing deleted files (`fetchMessageFromAPI`)
- Type mismatches from the new `storage` field
- Import paths referencing removed endpoint

**Step 4: Commit fixes**

```bash
git add plugins/intl/src/
git commit -m "fix(payload-intl): resolve test and type errors from storage refactor"
```

---

### Task 10: Build Verification

**Step 1: Build the plugin**

Run: `cd plugins/intl && pnpm build`
Expected: Clean build with no errors

**Step 2: Fix any build issues**

Address any remaining compilation errors.

**Step 3: Final commit**

```bash
git add plugins/intl/
git commit -m "chore(payload-intl): verify clean build after storage strategy refactor"
```
