# Intl Plugin Scopes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `scopes` option to the intl plugin that colocates translation editing with Payload globals via tabs or sidebar placement.

**Architecture:** Virtual JSON fields on globals bridge the admin UI to the existing messages collection. `afterRead` populates from the collection; `beforeChange` merges back. The endpoint switches to deep-merge to prevent scoped/shared overwrites. Existing `MessagesTree`/`MessageField` components are reused inside a new `ScopedMessagesField` client component.

**Tech Stack:** Payload CMS 3.x, React 19, react-hook-form, Lexical, ICU MessageFormat, vitest

**Design doc:** `docs/plans/2026-02-19-intl-scopes-design.md`

---

### Task 1: Types & Scope Config Normalization

**Files:**
- Modify: `plugins/intl/src/types.ts`
- Modify: `plugins/intl/src/index.ts` (MessagesPluginConfig)
- Create: `plugins/intl/src/utils/scopes.ts`
- Create: `plugins/intl/src/utils/scopes.test.ts`

**Step 1: Write the failing test**

Create `plugins/intl/src/utils/scopes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { NormalizedScope } from './scopes';
import { normalizeScopes } from './scopes';

describe('normalizeScopes', () => {
  it('should return empty map for undefined', () => {
    expect(normalizeScopes(undefined)).toEqual(new Map());
  });

  it('should normalize string array to tab defaults', () => {
    const result = normalizeScopes(['header', 'footer']);
    expect(result).toEqual(
      new Map<string, NormalizedScope>([
        ['header', { position: 'tab' }],
        ['footer', { position: 'tab' }],
      ]),
    );
  });

  it('should normalize string shorthand in record', () => {
    const result = normalizeScopes({ header: 'sidebar', footer: 'tab' });
    expect(result).toEqual(
      new Map<string, NormalizedScope>([
        ['header', { position: 'sidebar' }],
        ['footer', { position: 'tab' }],
      ]),
    );
  });

  it('should pass through full config object', () => {
    const result = normalizeScopes({
      header: { position: 'tab', existingFieldsTabLabel: 'Header Fields' },
    });
    expect(result).toEqual(
      new Map<string, NormalizedScope>([
        ['header', { position: 'tab', existingFieldsTabLabel: 'Header Fields' }],
      ]),
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd plugins/intl && pnpm test -- --run utils/scopes.test.ts`
Expected: FAIL — module not found

**Step 3: Add types**

In `plugins/intl/src/types.ts`, add after the `StorageStrategy` type:

```ts
export type ScopePosition = 'tab' | 'sidebar';

export type ScopeConfig =
  | ScopePosition
  | {
      position: ScopePosition;
      existingFieldsTabLabel?: string;
    };

export type Scopes = string[] | Record<string, ScopeConfig>;

export interface NormalizedScope {
  readonly position: ScopePosition;
  readonly existingFieldsTabLabel?: string;
}
```

In `plugins/intl/src/index.ts`, add `scopes` to `MessagesPluginConfig`:

```ts
import type { Scopes } from './types.ts';

export interface MessagesPluginConfig {
  schema: MessagesSchema;
  collectionSlug?: string;
  editorAccess?: MessagesGuard;
  hooks?: MessagesHooks;
  storage?: StorageStrategy;
  tabs?: boolean;
  scopes?: Scopes;
}
```

**Step 4: Implement normalizeScopes**

Create `plugins/intl/src/utils/scopes.ts`:

```ts
import type { NormalizedScope, Scopes } from '@/types';

export type { NormalizedScope };

export function normalizeScopes(
  scopes: Scopes | undefined,
): Map<string, NormalizedScope> {
  const result = new Map<string, NormalizedScope>();
  if (!scopes) return result;

  if (Array.isArray(scopes)) {
    for (const slug of scopes) {
      result.set(slug, { position: 'tab' });
    }
    return result;
  }

  for (const [slug, config] of Object.entries(scopes)) {
    if (typeof config === 'string') {
      result.set(slug, { position: config });
    } else {
      result.set(slug, config);
    }
  }
  return result;
}
```

**Step 5: Run test to verify it passes**

Run: `cd plugins/intl && pnpm test -- --run utils/scopes.test.ts`
Expected: PASS

**Step 6: Export new types from index**

In `plugins/intl/src/index.ts`, add to the re-exports at the bottom:

```ts
export type {
  Messages,
  MessagesSchema,
  NormalizedScope,
  ScopeConfig,
  ScopePosition,
  Scopes,
  StorageStrategy,
} from './types.ts';
```

**Step 7: Commit**

```bash
git add plugins/intl/src/types.ts plugins/intl/src/index.ts plugins/intl/src/utils/scopes.ts plugins/intl/src/utils/scopes.test.ts
git commit -m "feat(payload-intl): add scope types and normalization utility"
```

---

### Task 2: Update Plugin Context to Store Scopes

**Files:**
- Modify: `plugins/intl/src/const.ts`

**Step 1: Update Zod schema in PLUGIN_CONTEXT**

In `plugins/intl/src/const.ts`, update the context schema to include scopes info:

```ts
import {
  createPluginContext,
  defineProcedure,
} from '@davincicoding/payload-plugin-kit';
import { z } from 'zod/v4-mini';

const normalizedScopeSchema = z.object({
  position: z.enum(['tab', 'sidebar']),
  existingFieldsTabLabel: z.optional(z.string()),
});

export const PLUGIN_CONTEXT = createPluginContext(
  'payload-intl',
  z.object({
    collectionSlug: z.string(),
    storage: z.enum(['db', 'upload']),
    scopes: z.map(z.string(), normalizedScopeSchema),
  }),
);

export const ENDPOINTS = {
  setMessages: defineProcedure({
    path: '/intl-plugin',
    method: 'put',
  }).returns<{ success: boolean }>(),
};
```

**Step 2: Verify types compile**

Run: `cd plugins/intl && pnpm check:types`
Expected: May have errors in files that call `PLUGIN_CONTEXT.set()` — fix in next task.

**Step 3: Commit**

```bash
git add plugins/intl/src/const.ts
git commit -m "feat(payload-intl): extend plugin context with scopes"
```

---

### Task 3: Plugin Init — Process Scopes & Inject into Globals

**Files:**
- Modify: `plugins/intl/src/index.ts`
- Create: `plugins/intl/src/globals.ts`

**Step 1: Create the global injection utility**

Create `plugins/intl/src/globals.ts`:

```ts
import type { Field, GlobalConfig, TabsField } from 'payload';
import type { MessagesSchema, NormalizedScope } from '@/types';

/**
 * Creates the virtual JSON field that bridges the admin UI
 * to the messages collection for a scoped global.
 */
function createMessagesField(scopeKey: string, schema: MessagesSchema): Field {
  const subSchema = schema[scopeKey];
  if (!subSchema || typeof subSchema === 'string') {
    throw new Error(
      `[payload-intl] Scope "${scopeKey}" must reference a nested schema object, not a leaf string.`,
    );
  }

  return {
    name: '_intlMessages',
    type: 'json',
    virtual: true,
    admin: {
      components: {
        Field: {
          path: 'payload-intl/client#ScopedMessagesField',
          clientProps: {
            scopeKey,
            schema: subSchema,
          },
        },
      },
    },
  };
}

export function injectScopeIntoGlobal(
  global: GlobalConfig,
  scopeKey: string,
  scopeConfig: NormalizedScope,
  schema: MessagesSchema,
): GlobalConfig {
  const messagesField = createMessagesField(scopeKey, schema);

  if (scopeConfig.position === 'sidebar') {
    return {
      ...global,
      fields: [
        ...global.fields,
        {
          name: '_intlMessagesSidebar',
          type: 'group',
          admin: { position: 'sidebar' },
          fields: [messagesField],
        },
      ],
    };
  }

  // position === 'tab'
  const hasExistingTabs =
    global.fields[0]?.type === 'tabs' && 'tabs' in global.fields[0];

  const contentTabLabel =
    scopeConfig.existingFieldsTabLabel ?? global.label ?? 'Content';

  const messagesTab = {
    label: 'Messages',
    fields: [messagesField],
  };

  if (hasExistingTabs) {
    const existingTabsField = global.fields[0] as TabsField;
    const updatedTabs: TabsField = {
      ...existingTabsField,
      tabs: [...existingTabsField.tabs, messagesTab],
    };
    return {
      ...global,
      fields: [updatedTabs, ...global.fields.slice(1)],
    };
  }

  const tabsField: TabsField = {
    type: 'tabs',
    tabs: [
      {
        label: contentTabLabel,
        fields: [...global.fields],
      },
      messagesTab,
    ],
  };

  return {
    ...global,
    fields: [tabsField],
  };
}
```

**Step 2: Update plugin init to process scopes**

In `plugins/intl/src/index.ts`, update the plugin function:

```ts
import type { Plugin } from 'payload';
import type { MessagesViewProps } from './components/MessagesView';
import { PLUGIN_CONTEXT } from './const';
import { setMessagesEndpoint } from './endpoints/set-messages';
import { Messages } from './entities';
import { injectScopeIntoGlobal } from './globals';
import type {
  MessagesGuard,
  MessagesHooks,
  MessagesSchema,
  Scopes,
  StorageStrategy,
} from './types.ts';
import { getSupportedLocales } from './utils/config';
import { normalizeScopes } from './utils/scopes';

export interface MessagesPluginConfig {
  schema: MessagesSchema;
  collectionSlug?: string;
  editorAccess?: MessagesGuard;
  hooks?: MessagesHooks;
  storage?: StorageStrategy;
  tabs?: boolean;
  scopes?: Scopes;
}

export const intlPlugin =
  ({
    schema,
    tabs,
    collectionSlug = 'messages',
    hooks = {},
    editorAccess = (req) => req.user !== null,
    storage = 'db',
    scopes: rawScopes,
  }: MessagesPluginConfig): Plugin =>
  (config) => {
    if (!config.localization) {
      console.warn(
        '[payload-intl] You have not set the localization option in your Payload config, so this plugin will have no effect.',
      );
    }

    const locales = getSupportedLocales(config.localization);
    const scopes = normalizeScopes(rawScopes);

    // Admin actions & views
    config.admin ??= {};
    config.admin.components ??= {};
    config.admin.components.actions ??= [];
    config.admin.components.actions.push({
      exportName: 'MessagesLink',
      path: 'payload-intl/rsc#MessagesLink',
    });

    // Filter scoped keys from the /intl view schema
    const scopeKeys = new Set(scopes.keys());
    const viewSchema = Object.fromEntries(
      Object.entries(schema).filter(([key]) => !scopeKeys.has(key)),
    );

    config.admin.components.views = {
      ...config.admin.components.views,
      intl: {
        Component: {
          path: 'payload-intl/rsc#MessagesView',
          serverProps: {
            access: editorAccess,
            locales,
            schema: viewSchema,
            fullSchema: schema,
            tabs,
            scopes,
          } satisfies MessagesViewProps,
        },
        path: '/intl',
      },
    };

    // Inject scopes into matching globals
    if (scopes.size > 0) {
      config.globals = (config.globals ?? []).map((global) => {
        const scopeConfig = scopes.get(global.slug);
        if (!scopeConfig) return global;

        return injectScopeIntoGlobal(global, global.slug, scopeConfig, schema);
      });
    }

    // Plugin context, collection, endpoint
    PLUGIN_CONTEXT.set(config, {
      collectionSlug,
      storage,
      scopes,
    });
    config.collections ??= [];
    config.collections.push(Messages({ slug: collectionSlug, hooks, storage }));

    config.endpoints ??= [];
    config.endpoints.push(setMessagesEndpoint);

    return config;
  };
```

Note: `MessagesViewProps` will need to be updated in Task 7.

**Step 3: Verify types compile**

Run: `cd plugins/intl && pnpm check:types`
Expected: May still have errors until all dependent files are updated. Fix as needed.

**Step 4: Commit**

```bash
git add plugins/intl/src/index.ts plugins/intl/src/globals.ts
git commit -m "feat(payload-intl): inject scoped messages tab/sidebar into globals"
```

---

### Task 4: Endpoint Merge Strategy

The endpoint currently does a full replace of `data` for each locale. With scopes, the `/intl` view only sends unscoped keys. A full replace would wipe scoped keys. Switch to deep merge.

**Files:**
- Modify: `plugins/intl/src/endpoints/set-messages.ts`

**Step 1: Update endpoint to merge**

The key change is in the `'db'` case. Instead of:
```ts
data: { data: messages }
```

Fetch existing data first, merge, then save:

```ts
case 'db': {
  const { docs } = await req.payload.find({
    collection: ctx.collectionSlug as 'messages',
    where: { locale: { equals: locale } },
    limit: 1,
  });

  const existingDoc = docs[0];
  const existingData =
    (existingDoc?.data as Record<string, unknown>) ?? {};
  const mergedData = { ...existingData, ...messages };

  if (existingDoc) {
    await req.payload.update({
      collection: ctx.collectionSlug as 'messages',
      id: existingDoc.id,
      data: { data: mergedData },
    });
  } else {
    await req.payload.create({
      collection: ctx.collectionSlug as 'messages',
      data: { locale, data: mergedData },
    });
  }
  break;
}
```

For the `'upload'` case, do the same: fetch existing file, parse, merge, re-upload.

**Step 2: Verify types compile**

Run: `cd plugins/intl && pnpm check:types`

**Step 3: Commit**

```bash
git add plugins/intl/src/endpoints/set-messages.ts
git commit -m "fix(payload-intl): use merge strategy in set-messages endpoint"
```

---

### Task 5: Global Hooks (afterRead / beforeChange)

**Files:**
- Create: `plugins/intl/src/global-hooks.ts`
- Modify: `plugins/intl/src/globals.ts` (attach hooks)

**Step 1: Create global hooks**

Create `plugins/intl/src/global-hooks.ts`:

```ts
import type {
  GlobalAfterReadHook,
  GlobalBeforeChangeHook,
} from 'payload';
import { PLUGIN_CONTEXT } from '@/const';
import { fetchMessages } from '@/requests/fetchMessages';
import { getSupportedLocales } from '@/utils/config';

/**
 * Populates the virtual `_intlMessages` field with scoped
 * translations from the messages collection.
 */
export function createAfterReadHook(scopeKey: string): GlobalAfterReadHook {
  return async ({ doc, req }) => {
    const locales = getSupportedLocales(req.payload.config.localization);
    const translations: Record<string, unknown> = {};

    for (const locale of locales) {
      const allMessages = await fetchMessages(req.payload, locale);
      const scoped = (allMessages as Record<string, unknown>)[scopeKey];
      if (scoped !== undefined) {
        translations[locale] = scoped;
      }
    }

    return {
      ...doc,
      _intlMessages: translations,
    };
  };
}

/**
 * Extracts `_intlMessages` from the incoming data, merges each
 * locale's scoped key back into the messages collection, and
 * strips the virtual field from the global's data.
 */
export function createBeforeChangeHook(
  scopeKey: string,
): GlobalBeforeChangeHook {
  return async ({ data, req }) => {
    const intlMessages = data._intlMessages as
      | Record<string, unknown>
      | undefined;

    if (!intlMessages) return data;

    const ctx = PLUGIN_CONTEXT.get(req.payload.config);
    if (!ctx) return data;

    const { collectionSlug } = ctx;

    for (const [locale, scopedMessages] of Object.entries(intlMessages)) {
      if (scopedMessages === undefined) continue;

      const { docs } = await req.payload.find({
        collection: collectionSlug as 'messages',
        where: { locale: { equals: locale } },
        limit: 1,
      });

      const existingDoc = docs[0];
      const existingData =
        (existingDoc?.data as Record<string, unknown>) ?? {};
      const mergedData = { ...existingData, [scopeKey]: scopedMessages };

      if (existingDoc) {
        await req.payload.update({
          collection: collectionSlug as 'messages',
          id: existingDoc.id,
          data: { data: mergedData },
          req,
        });
      } else {
        await req.payload.create({
          collection: collectionSlug as 'messages',
          data: { locale, data: mergedData },
          req,
        });
      }
    }

    // Strip virtual field
    const { _intlMessages: _, ...rest } = data;
    return rest;
  };
}
```

**Step 2: Attach hooks in `injectScopeIntoGlobal`**

In `plugins/intl/src/globals.ts`, update to attach the hooks:

```ts
import {
  createAfterReadHook,
  createBeforeChangeHook,
} from '@/global-hooks';

export function injectScopeIntoGlobal(
  global: GlobalConfig,
  scopeKey: string,
  scopeConfig: NormalizedScope,
  schema: MessagesSchema,
): GlobalConfig {
  const messagesField = createMessagesField(scopeKey, schema);
  const afterReadHook = createAfterReadHook(scopeKey);
  const beforeChangeHook = createBeforeChangeHook(scopeKey);

  const withHooks = {
    ...global,
    hooks: {
      ...global.hooks,
      afterRead: [...(global.hooks?.afterRead ?? []), afterReadHook],
      beforeChange: [...(global.hooks?.beforeChange ?? []), beforeChangeHook],
    },
  };

  // ... rest of tab/sidebar injection logic uses `withHooks` instead of `global`
}
```

Replace all references to `global` with `withHooks` in the existing tab/sidebar logic (the `return` statements for sidebar, hasExistingTabs, and no-tabs branches).

**Step 3: Verify types compile**

Run: `cd plugins/intl && pnpm check:types`

**Step 4: Commit**

```bash
git add plugins/intl/src/global-hooks.ts plugins/intl/src/globals.ts
git commit -m "feat(payload-intl): add afterRead/beforeChange hooks for scoped globals"
```

---

### Task 6: Scoped Messages Field Component

This is the custom client component that renders inside the virtual field on the global. It reuses the existing `MessagesTree`/`MessageField` components.

**Files:**
- Create: `plugins/intl/src/components/ScopedMessagesField.tsx`
- Create: `plugins/intl/src/components/ScopedMessagesField.module.css`
- Modify: `plugins/intl/src/exports/client.ts`

**Step 1: Create the component**

Create `plugins/intl/src/components/ScopedMessagesField.tsx`:

```tsx
'use client';

import { Button, useDocumentInfo, useField } from '@payloadcms/ui';
import { IconWorld } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { JSONFieldClientComponent } from 'payload';
import type { FormValues } from '@/components/MessagesFormProvider';
import { MessagesFormProvider } from '@/components/MessagesFormProvider';
import type { DeepPartial, Messages, MessagesSchema, Translations } from '@/types';
import { sanitizeMessages } from '@/utils/sanitize';
import { MessagesTree } from './layout/MessagesTree';
import styles from './ScopedMessagesField.module.css';

interface ScopedMessagesFieldProps {
  scopeKey: string;
  schema: MessagesSchema;
}

export const ScopedMessagesField: JSONFieldClientComponent = ({
  field,
  path,
  ...rest
}) => {
  const { scopeKey, schema } = (rest as unknown as { scopeKey: string; schema: MessagesSchema });
  const { value, setValue } = useField<Translations<DeepPartial<Messages>>>({
    path: path ?? '_intlMessages',
  });

  // Get locale info from Payload config (via document context)
  // The component receives all locale data in the field value
  const locales = useMemo(
    () => (value ? Object.keys(value) : []),
    [value],
  );
  const defaultLocale = locales[0] ?? 'en';
  const [activeLocale, setActiveLocale] = useState(defaultLocale);

  // Sync form with field value
  const form = useForm<FormValues>({
    defaultValues: value ?? {},
    reValidateMode: 'onBlur',
  });

  // When form values change, push back to Payload's field
  useEffect(() => {
    const subscription = form.watch((formValues) => {
      setValue(formValues);
    });
    return () => subscription.unsubscribe();
  }, [form, setValue]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.localeSelector}>
          {locales.map((locale) => (
            <Button
              buttonStyle={activeLocale === locale ? 'pill' : 'tab'}
              key={locale}
              onClick={() => setActiveLocale(locale)}
              size="small"
              type="button"
            >
              {locale.toUpperCase()}
            </Button>
          ))}
        </div>
        <a className={styles.sharedLink} href="/admin/intl">
          <IconWorld size={16} strokeWidth={1.5} />
          Shared messages
        </a>
      </div>

      <MessagesFormProvider
        activeLocale={activeLocale}
        defaultLocale={defaultLocale}
        form={form}
        locales={locales}
      >
        <MessagesTree nestingLevel={0} path="" schema={schema} />
      </MessagesFormProvider>
    </div>
  );
};
```

**Step 2: Create basic styles**

Create `plugins/intl/src/components/ScopedMessagesField.module.css`:

```css
.container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.localeSelector {
  display: flex;
  gap: 0.25rem;
}

.sharedLink {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: var(--theme-elevation-500);
  text-decoration: none;
}

.sharedLink:hover {
  color: var(--theme-elevation-800);
}
```

**Step 3: Export from client entry**

In `plugins/intl/src/exports/client.ts`:

```ts
export { ScopedMessagesField } from '../components/ScopedMessagesField';
```

**Step 4: Verify types compile**

Run: `cd plugins/intl && pnpm check:types`
Expected: May need to adjust generic types on `JSONFieldClientComponent`. Adapt as needed.

**Step 5: Commit**

```bash
git add plugins/intl/src/components/ScopedMessagesField.tsx plugins/intl/src/components/ScopedMessagesField.module.css plugins/intl/src/exports/client.ts
git commit -m "feat(payload-intl): add ScopedMessagesField client component"
```

---

### Task 7: MessagesView Filtering & Scopes Prop

The `/intl` view needs to show only unscoped keys and receive scopes info for the Scopes button.

**Files:**
- Modify: `plugins/intl/src/components/MessagesView.tsx`
- Modify: `plugins/intl/src/exports/rsc.ts`

**Step 1: Update MessagesViewProps**

In `plugins/intl/src/components/MessagesView.tsx`, update the interface and component:

```ts
import type { NormalizedScope } from '@/types';

export interface MessagesViewProps {
  locales: Locale[];
  schema: Messages;        // already filtered by plugin init (unscoped only)
  fullSchema: Messages;    // complete schema (for "show all" toggle)
  tabs: boolean | undefined;
  access: MessagesGuard;
  scopes: Map<string, NormalizedScope>;
}
```

Update the component signature to accept the new props. Pass `scopes` down to `MessagesForm` (which will forward to the Scopes button — Task 8).

In the `MessagesForm` call, add the scopes prop:

```tsx
<MessagesForm
  activeLocale={activeLocale}
  defaultLocale={defaultLocale}
  endpointUrl={endpointUrl}
  locales={locales}
  schema={schema}
  tabs={tabs}
  values={translations}
  scopes={scopes}
/>
```

**Step 2: Verify types compile**

Run: `cd plugins/intl && pnpm check:types`

**Step 3: Commit**

```bash
git add plugins/intl/src/components/MessagesView.tsx
git commit -m "feat(payload-intl): filter scoped keys from /intl view"
```

---

### Task 8: Scopes Button Component

**Files:**
- Create: `plugins/intl/src/components/actions/ScopesButton.tsx`
- Create: `plugins/intl/src/components/actions/ScopesButton.module.css`
- Modify: `plugins/intl/src/components/MessagesForm.tsx`

**Step 1: Create ScopesButton component**

Create `plugins/intl/src/components/actions/ScopesButton.tsx`:

```tsx
'use client';

import { Popup, Button } from '@payloadcms/ui';
import { IconWorld, IconExternalLink } from '@tabler/icons-react';
import { useState } from 'react';
import type { NormalizedScope } from '@/types';
import { toWords } from '@/utils/format';
import styles from './ScopesButton.module.css';

interface ScopesButtonProps {
  scopes: Map<string, NormalizedScope>;
  onShowAllChange?: (showAll: boolean) => void;
}

export function ScopesButton({
  scopes,
  onShowAllChange,
}: ScopesButtonProps): React.ReactNode {
  const [showAll, setShowAll] = useState(false);

  if (scopes.size === 0) return null;

  const handleToggle = () => {
    const next = !showAll;
    setShowAll(next);
    onShowAllChange?.(next);
  };

  return (
    <Popup
      button={
        <Button buttonStyle="tab" type="button">
          <IconWorld size={18} strokeWidth={1.5} />
          Scopes
        </Button>
      }
      horizontalAlign="right"
      size="large"
    >
      <div className={styles.popup}>
        <div className={styles.scopesList}>
          {Array.from(scopes.entries()).map(([slug]) => (
            <a
              className={styles.scopeItem}
              href={`/admin/globals/${slug}`}
              key={slug}
            >
              <span>{toWords(slug)}</span>
              <IconExternalLink size={14} strokeWidth={1.5} />
            </a>
          ))}
        </div>
        <button
          className={styles.showAllToggle}
          onClick={handleToggle}
          type="button"
        >
          {showAll ? 'Hide scoped messages' : 'Show all messages'}
        </button>
      </div>
    </Popup>
  );
}
```

**Step 2: Create styles**

Create `plugins/intl/src/components/actions/ScopesButton.module.css`:

```css
.popup {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  min-width: 200px;
}

.scopesList {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.scopeItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  text-decoration: none;
  color: var(--theme-elevation-800);
  font-size: 0.875rem;
}

.scopeItem:hover {
  background: var(--theme-elevation-50);
}

.showAllToggle {
  all: unset;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--theme-elevation-500);
  text-align: center;
  padding: 0.375rem;
  border-top: 1px solid var(--theme-elevation-100);
}

.showAllToggle:hover {
  color: var(--theme-elevation-800);
}
```

**Step 3: Integrate into MessagesForm**

In `plugins/intl/src/components/MessagesForm.tsx`:

- Add `scopes` to `MessagesFormProps`
- Add `ScopesButton` to the actions area (next to `JsonImport` and Save)
- Add state for `showAll` and conditionally render scoped read-only messages

Add to the imports and props:

```ts
import type { NormalizedScope } from '@/types';
import { ScopesButton } from './actions/ScopesButton';
```

Add to the interface:

```ts
interface MessagesFormProps {
  // ... existing props
  scopes?: Map<string, NormalizedScope>;
}
```

In the JSX actions area, add before the Save button:

```tsx
{scopes && scopes.size > 0 && (
  <ScopesButton scopes={scopes} />
)}
```

**Step 4: Verify types compile**

Run: `cd plugins/intl && pnpm check:types`

**Step 5: Commit**

```bash
git add plugins/intl/src/components/actions/ScopesButton.tsx plugins/intl/src/components/actions/ScopesButton.module.css plugins/intl/src/components/MessagesForm.tsx
git commit -m "feat(payload-intl): add Scopes navigation button to /intl view"
```

---

### Task 9: Sandbox Integration

Update the sandbox to test the scopes feature with real globals.

**Files:**
- Modify: `sandbox/src/payload.config.ts`
- Modify: `sandbox/src/i18n/messages.ts`

**Step 1: Add globals to sandbox config**

In `sandbox/src/payload.config.ts`, add globals that match existing top-level schema keys. Looking at `sandbox/src/i18n/messages.ts`, good candidates are `navigation` and `landing`:

```ts
export default buildConfig({
  // ... existing config
  globals: [
    {
      slug: 'navigation',
      label: 'Navigation',
      fields: [
        {
          name: 'logoText',
          type: 'text',
          defaultValue: 'Swiss Influence',
        },
      ],
    },
  ],
  plugins: [
    // ... other plugins
    intlPlugin({
      schema: messages,
      tabs: true,
      storage: 'upload',
      scopes: ['navigation'],
    }),
    // ... rest
  ],
});
```

**Step 2: Test in browser**

Run: `cd sandbox && pnpm dev`

Verify:
1. The Navigation global has a "Messages" tab with the scoped message editor
2. The `/intl` view no longer shows `navigation.*` keys
3. The Scopes button in `/intl` links to the Navigation global
4. Saving the Navigation global persists messages to the messages collection
5. `fetchMessages()` still returns the full merged object

**Step 3: Commit**

```bash
git add sandbox/src/payload.config.ts
git commit -m "feat(sandbox): add navigation global with intl scopes"
```

---

### Task 10: Run Full Test Suite & Fix

**Step 1: Run all existing tests**

Run: `cd plugins/intl && pnpm test`

Fix any failures caused by the context schema change (Task 2) or endpoint change (Task 4). The most likely breakage is in `fetchMessages.test.ts` if it mocks the plugin context — update mocks to include the new `scopes` field.

**Step 2: Run type checks across the monorepo**

Run: `pnpm -r check:types`

**Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix(payload-intl): update tests for scopes context schema"
```

---

## Notes for the Implementer

### Key Files Reference

| File | Purpose |
|------|---------|
| `plugins/intl/src/index.ts` | Plugin entry — config, scope normalization, global injection |
| `plugins/intl/src/types.ts` | All type definitions including new scope types |
| `plugins/intl/src/const.ts` | Plugin context (WeakMap) and endpoint definitions |
| `plugins/intl/src/globals.ts` | `injectScopeIntoGlobal()` — tab/sidebar injection |
| `plugins/intl/src/global-hooks.ts` | `afterRead`/`beforeChange` hooks for scoped globals |
| `plugins/intl/src/endpoints/set-messages.ts` | PUT endpoint — now uses merge strategy |
| `plugins/intl/src/components/ScopedMessagesField.tsx` | Client component for global's messages tab |
| `plugins/intl/src/components/actions/ScopesButton.tsx` | Popup navigation for scopes in /intl view |
| `plugins/intl/src/components/MessagesView.tsx` | Server component — filtered schema |
| `plugins/intl/src/components/MessagesForm.tsx` | Client form — accepts scopes prop |
| `plugins/intl/src/utils/scopes.ts` | `normalizeScopes()` utility |

### Payload Patterns to Know

- **Virtual fields** (`virtual: true`): not stored in DB, must be populated via `afterRead` hook
- **Tab injection**: check `fields[0].type === 'tabs'` to detect existing tabs (SEO plugin pattern)
- **Sidebar fields**: use `admin: { position: 'sidebar' }` on a group field
- **Custom field components**: registered via `admin.components.Field` with `path` pointing to export
- **Plugin context**: `PLUGIN_CONTEXT` is a WeakMap keyed by Payload config, set during plugin init

### Testing Commands

```bash
cd plugins/intl && pnpm test           # unit tests
cd plugins/intl && pnpm check:types    # type check
cd sandbox && pnpm dev                 # manual testing
```
