# Intl Plugin: Scoped Messages Design

## Problem

All i18n messages are managed in a single `/intl` admin view. Content editors
must leave the global they're editing to manage its translations. This creates
a disconnected editing experience.

## Solution

Add a `scopes` option that colocates translation editing with Payload globals.
Each scope maps a top-level schema key to a global of the same slug. Scoped
messages appear as a tab or sidebar within the global's edit view. Shared
(unscoped) messages remain in the existing `/intl` view.

## Design Decisions

- **Single unified schema** -- the schema stays the single source of truth.
  `scopes` controls where each portion is edited, not how it's structured.
- **Storage unchanged** -- messages stay in the messages collection (one doc
  per locale with a flat JSON `data` field). `fetchMessages()` returns the
  same shape. next-intl consumers are unaffected.
- **Virtual field + hooks** -- a `virtual: true` JSON field on the global
  bridges the admin UI to the messages collection without storing data on the
  global itself.
- **No runtime validation** -- TypeScript enforces that scope keys exist in
  both the schema and as global slugs. Runtime checks are redundant.

## Config API

### `scopes` Option

Accepts either an array of strings or a record with per-scope configuration:

```ts
// Types
type ScopePosition = 'tab' | 'sidebar'

type ScopeConfig =
  | ScopePosition
  | {
      position: ScopePosition
      existingFieldsTabLabel?: string // only for position: 'tab'
    }

type Scopes = string[] | Record<string, ScopeConfig>
```

### Examples

```ts
// Simple: array of strings (defaults to 'tab')
intlPlugin({
  schema: {
    header: { nav: { home: 'Home', about: 'About' } },
    footer: { copyright: '(c) {year} Acme' },
    common: { greeting: 'Hello {name}!' },
  },
  scopes: ['header', 'footer'],
})

// Detailed: record with per-scope config
intlPlugin({
  schema: {
    header: { nav: { home: 'Home', about: 'About' } },
    footer: { copyright: '(c) {year} Acme' },
    navigation: { items: { blog: 'Blog' } },
    common: { greeting: 'Hello {name}!' },
  },
  scopes: {
    header: 'sidebar',
    footer: 'tab',
    navigation: {
      position: 'tab',
      existingFieldsTabLabel: 'Nav Fields',
    },
  },
})
```

When an array is passed, each scope defaults to `{ position: 'tab' }`. When a
string shorthand is passed, it expands to `{ position: <value> }`.

### Backward Compatibility

`scopes` is optional and defaults to `[]`. Without it, the plugin behaves
exactly as it does today.

## Global Tab Injection

For each scope with `position: 'tab'`, the plugin transforms the matching
global's fields following the same pattern as `@payloadcms/plugin-seo`:

1. Check if `global.fields[0]` is already a `tabs` field.
2. If yes: append a "Messages" tab to the existing tabs.
3. If no: wrap existing fields in a tab labeled with `existingFieldsTabLabel`
   (falls back to `global.label || 'Content'`), then append the "Messages" tab.

The Messages tab contains a single `virtual: true` JSON field with a custom
field component that renders the existing Lexical-based message editor.

For `position: 'sidebar'`, the virtual field is placed in the global's sidebar
area instead of a tab.

## Virtual Field & Hook Choreography

A `virtual: true` field named `_intlMessages` is added to each scoped global.

### `afterRead` Hook

1. Fetch all locale documents from the messages collection.
2. For each locale, extract just the scoped key (e.g., `data.header`).
3. Populate `_intlMessages` with shape:
   `{ en: { nav: { home: "Home" } }, de: { nav: { home: "Startseite" } } }`

### `beforeChange` Hook

1. Read `_intlMessages` from the incoming data.
2. For each changed locale, merge the scoped key back into that locale's
   messages collection document.
3. Strip `_intlMessages` from the data so nothing is persisted on the global.

### Custom Field Component

- Renders the existing `MessagesTree` / `MessageInput` / variable editors.
- Scoped to the sub-schema for this global (e.g., `schema.header`).
- Includes locale switcher and reference view for non-default locales.
- Reuses the same Lexical ICU editor with variable autocompletion.

## `/intl` View Changes

### Scoped Keys Hidden

Scoped keys are excluded from the `/intl` view's schema. Only unscoped keys
appear for editing.

### Scopes Button

A "Scopes" button appears in the action area when scopes are configured. It
opens a popup with:

- A list of all scopes, each showing the global name and a link to navigate to
  that global's edit view (anchored to the Messages tab).
- A "Show all" toggle that, when enabled, renders scoped messages inline as
  read-only below the shared messages.

### Back-link from Globals

Each global's Messages tab/sidebar shows a link: "View shared messages" that
navigates back to `/admin/intl`.

## Storage Model

No changes. The messages collection retains its current structure:

```json
{
  "locale": "en",
  "data": {
    "header": { "nav": { "home": "Home" } },
    "footer": { "copyright": "(c) 2026 Acme" },
    "common": { "greeting": "Hello {name}!" }
  }
}
```

`fetchMessages(payload, locale)` returns the same flat object. The `storage`
option (`'db'` or `'upload'`) continues to work as before. Consumers are
completely unaware of scopes.

## Scope of Work Summary

1. **Config**: add `scopes` option with type, normalization, and TS inference.
2. **Plugin init**: for each scope, inject tab/sidebar into the matching global
   with virtual field and hooks.
3. **Field component**: adapt existing message editor components to work within
   Payload's field system, scoped to a sub-schema.
4. **`/intl` view**: filter scoped keys, add Scopes button with popup, add
   "show all" toggle.
5. **Global back-link**: add navigation link from global Messages tab to `/intl`.
6. **Endpoint**: update `set-messages` to support partial writes (only the
   scoped key portion of a locale document).
