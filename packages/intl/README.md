# payload-intl

**payload-intl** moves translations out of your codebase.

1. Define message keys (and their arguments) in TypeScript.
2. Translate them in Payload’s admin panel — no code required.

**Features**

- Define message schema in code; edit translations in a rich admin UI
- Compatible with [next-intl](https://next-intl.dev/) and any ICU consumer
- Automatic runtime validation of message arguments
- Autocomplete to quickly insert and configure valid ICU arguments
- Add optional descriptions to each message so editors understand the context
- Visual tree & tabbed editor for quick navigation
<!-- - Support for Rich Text messages -->
<!-- - Import/export JSON, copy messages between paths -->

## Getting Started

```bash
# pnpm
pnpm add payload-intl
# yarn
yarn add payload-intl
# npm
npm install payload-intl
```

### 1) Define messages

Organize messages in a hierarchical structure using ICU MessageFormat:

```typescript
// messages.ts
export default {
  UserProfile: {
    title: "Hello {firstName}",
    description:
      "Welcome back, {firstName}! You have {count, plural, =0 {no messages} one {# message} other {# messages}}.",
    status:
      "Your account is {status, select, active {active} inactive {inactive} pending {pending} other {unknown}}.",
  },
  Navigation: {
    home: "Home",
    about: "About",
  },
} as const;
```

You can also use JSON files, but additional steps are required for type-safe arguments with next-intl. See the [next-intl documentation](https://next-intl.dev/docs/workflows/typescript#messages-arguments) for details.

### 2) Configure Payload

Add the plugin to your `payload.config.ts`:

```typescript
import { buildConfig } from "payload";
import { intlPlugin } from "payload-intl";

import messages from "./messages";

export default buildConfig({
  // the plugin reads locales from this config
  localization: {
    locales: ["en", "de", "fr"],
    defaultLocale: "en",
  },
  plugins: [
    // add the plugin
    intlPlugin({
      schema: messages,
    }),
    // add the "messages" collection to your storage adapter
  ],
});
```

### 3) Fetch messages in your app

**Node.js:**

```typescript
import config from "@payload-config";
import { getPayload } from "payload";
import { fetchMessages } from "payload-intl/requests";

const payload = await getPayload({ config });
const messages = await fetchMessages(payload, "en");
```

**Edge runtime:**

```typescript
const response = await fetch(`${process.env.PAYLOAD_API_URL}/intl-plugin/en`);
const messages = await response.json();
```

## Plugin Options

The `intlPlugin` accepts the following configuration:

| Option                  | Default                  | Description                                             |
| ----------------------- | ------------------------ | ------------------------------------------------------- |
| `schema`                | **Required**             | Your messages schema definition                         |
| `collectionSlug`        | `"messages"`             | Custom collection slug                                  |
| `editorAccess`          | Authenticated users only | Access control for editing messages                     |
| `hooks`                 | -                        | Collection hooks with and additional `afterUpdate` hook |
| `tabs`                  | -                        | Enable tabbed interface                                 |

<!-- ## Storage Adapter Requirements

The plugin creates a "messages" upload collection that stores translations as JSON files.

You must ensure that the storage provider returns the direct URL to the uploaded files and read access is guaranteed. -->

<!-- ## Message Schema Definition

### Message Descriptions

Add context for editors using the syntax `"[Description] message"`:

```typescript
export default {
  UserProfile: {
    title: "[Greeting shown at the top of user profile page] Hello {firstName}",
    description:
      "[Subtitle with user's name and message count] Welcome back, {firstName}! You have {count} new messages.",
  },
} as const;
``` -->

<!-- ### Rich Text Messages

Use `"$RICH$"` as the message value to enable rich text editing. Note that rich text messages do not support ICU arguments.

```typescript
export default {
  Content: {
    welcome: "$RICH$", // Rich text editor will be used
    terms: "$RICH$", // Rich text editor will be used
  },
} as const;
``` -->

## Example Usage

Here's a complete example showing how to integrate payload-intl using next-intl and S3 storage:

```typescript
// payload.config.ts
import { s3Storage } from "@payloadcms/storage-s3";
import { revalidateTag } from "next/cache";
import { buildConfig } from "payload";
import { intlPlugin } from "payload-intl";

import { messages } from "./i18n/messages";

export default buildConfig({
  localization: {
    locales: ["en", "de", "fr"],
    defaultLocale: "en",
  },
  plugins: [
    intlPlugin({
      schema: messages,
      hooks: {
        afterUpdate: () => revalidateTag("messages"), // or anything else you want
      },
    }),
    s3Storage({
      collections: {
        messages: {
          prefix: "messages", // or anything else you want
        },
      },
    }),
  ],
});
```

```typescript
// i18n/messages.ts
export const messages = {
  UserProfile: {
    title: "Hello {firstName}",
    description:
      "Welcome back, {firstName}! You have {count, plural, =0 {no messages} one {# message} other {# messages}}.",
  },
  // ...
} as const;
```

```typescript
// i18n/global.ts
import type messages from "./messages";

declare module "next-intl" {
  interface AppConfig {
    Messages: typeof messages;
    // ...
  }
}
```

```typescript
// i18n/request.ts
import { getRequestConfig } from "next-intl/server";

import { fetchCachedMessages } from "./server/messages";

export default getRequestConfig(async ({ locale }) => {
  const messages = await fetchCachedMessages(locale);

  return {
    locale,
    messages,
  };
});
```

```typescript
// server.ts
"use server";

import config from "@payload-config";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";
import { fetchMessages } from "payload-intl";

export const fetchCachedMessages = unstable_cache(
  async (locale: string) => {
    // Node.js
    const payload = await getPayload({ config });
    return await fetchMessages(payload, locale);

    // Edge runtime
    const response = await fetch(
      `${process.env.PAYLOAD_API_URL}/intl-plugin/en`,
    );
    return await response.json();
  },
  ["messages"],
  {
    revalidate: false,
  },
);
```

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build the plugin
pnpm build

# Run tests
pnpm test
```

## License

MIT
