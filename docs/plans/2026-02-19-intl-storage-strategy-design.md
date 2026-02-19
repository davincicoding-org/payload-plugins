# Intl Plugin: Dual Storage Strategy

## Problem

The intl plugin stores messages as uploaded JSON files. `fetchMessages`
queries the collection to get a file URL, then does `fetch(url)` to read
the content. During `next build`, there is no running server to serve
the file, causing `ECONNREFUSED` locally and endpoint failures on Vercel.

The storage itself is not broken. The retrieval path is.

## Solution

Add a `storage` config option to let consumers choose between database
storage (JSON field) and file storage (upload). Default to `'db'` which
eliminates the HTTP fetch entirely.

## Config Change

```typescript
export interface MessagesPluginConfig {
  schema: MessagesSchema;
  collectionSlug?: string;
  editorAccess?: MessagesGuard;
  hooks?: MessagesHooks;
  tabs?: boolean;
  storage?: 'db' | 'upload'; // default: 'db'
}
```

## Collection Shape

### `storage: 'db'` (default)

```typescript
{
  fields: [
    { name: 'locale', type: 'text', required: true },
    { name: 'data', type: 'json', required: true },
  ],
  indexes: [{ fields: ['locale'] }],
  // No upload config
}
```

### `storage: 'upload'`

```typescript
{
  fields: [
    { name: 'locale', type: 'text', required: true },
  ],
  upload: { mimeTypes: ['application/json'] },
  indexes: [{ fields: ['locale'] }],
}
```

## API Surface Changes

### Removed

- `GET /intl-plugin/:locale` endpoint
- `fetchMessagesFromAPI` function and `MessagesRequestConfig` type
- `fetchMessages` overload accepting `MessagesRequestConfig`
- `getMessages` procedure in `const.ts`

### Kept

- `PUT /intl-plugin` endpoint (admin UI submits from the browser)
- `fetchMessages(payload, locale)` single-signature export

## Fetch Behavior

### `storage: 'db'`

```
payload.find({ collection, where: { locale } }) -> doc.data
```

Single database query. No network calls. Works at build time.

### `storage: 'upload'`

```
payload.find({ collection, where: { locale } }) -> doc.url -> fetch(url) -> JSON
```

Current behavior. Requires reachable storage at read time.

## Set Behavior

### `storage: 'db'`

Upsert documents with `{ locale, data: messages }` directly. No File
object creation.

### `storage: 'upload'`

Current behavior. Create File from JSON, upload through Payload.

## Auto-Migration on Startup

When the plugin initializes, detect documents in the wrong format and
migrate them.

### `upload` to `db`

1. Find documents with a `url` but no `data` field
2. Fetch each file URL, parse JSON
3. Update document with `{ data: messages }`
4. Log migration activity

Requires reachable storage URLs. Runs at runtime, not build time.

### `db` to `upload`

1. Find documents with `data` but no uploaded file
2. Create File from `JSON.stringify(data)`
3. Update document with the file
4. Log migration activity

## Admin UI Impact

- `MessagesView` (server component): loads via `fetchMessages(payload,
  locale)`. No change needed beyond removing `endpointUrl` construction
  for the removed GET endpoint.
- `useMessagesFormSubmit` (client hook): saves via `PUT /intl-plugin`.
  No change to the client. The endpoint internally branches on strategy.

## Files Affected

| File | Change |
|------|--------|
| `index.ts` | Add `storage` to config, pass to context and entities |
| `types.ts` | Add storage type, remove `MessagesRequestConfig` re-export |
| `entities.ts` | Conditionally add `data` field or `upload` config |
| `const.ts` | Remove `getMessages` procedure |
| `endpoints/get-messages.ts` | Delete |
| `endpoints/set-messages.ts` | Branch on storage strategy |
| `requests/fetchMessages.ts` | Single signature, branch on strategy |
| `requests/fetchMessageFromPayload.ts` | Add `'db'` code path |
| `requests/fetchMessageFromAPI.ts` | Delete |
| `utils/config.ts` | Store `storage` in plugin context |
| `components/MessagesView.tsx` | Remove GET endpoint URL construction |
| New: migration utility | Auto-migrate between storage formats |
