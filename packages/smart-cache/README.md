# payload-smart-cache

**payload-smart-cache** manages cache invalidation for your Payload CMS collections.

1. Automatically tracks changes to your collections (create, update, delete).
2. Queues changes for publishing and invalidates cache tags when ready.

**Features**

- Automatic change tracking for configured collections
- Publish queue to batch cache invalidations
- Dependency-aware cache invalidation across related collections
- Next.js cache tag revalidation integration
- Publish button in admin panel for manual publishing
- Configurable operations per collection (create, update, delete)

## Getting Started

```bash
# pnpm
pnpm add payload-smart-cache
# yarn
yarn add payload-smart-cache
# npm
npm install payload-smart-cache
```

### 1) Configure Payload

Add the plugin to your `payload.config.ts`:

```typescript
import { buildConfig } from "payload";
import { smartCachPlugin } from "payload-smart-cache";

export default buildConfig({
  collections: [Posts, Categories, Users],
  plugins: [
    smartCachPlugin({
      collections: {
        posts: ["create", "update", "delete"],
        categories: ["create", "update"],
        // users: false, // Disable tracking for users
      },
      publishHandler: async (changes) => {
        // Optional: Custom handler for published changes
        console.log("Published changes:", changes);
      },
    }),
  ],
});
```

### 2) Use the Publish Button

The plugin automatically adds a **Publish** button to your admin panel header. Click it to process all queued changes and invalidate cache tags.

### 3) Programmatic Publishing

You can also trigger publishing programmatically:

**Node.js:**

```typescript
import config from "@payload-config";
import { getPayload } from "payload";

const payload = await getPayload({ config });
const response = await fetch(`${process.env.PAYLOAD_API_URL}/cache-plugin/publish`, {
  method: "POST",
});
```

**Edge runtime:**

```typescript
const response = await fetch(`${process.env.PAYLOAD_API_URL}/cache-plugin/publish`, {
  method: "POST",
});
```

## Plugin Options

The `smartCachPlugin` accepts the following configuration:

| Option            | Default                    | Description                                                                 |
| ----------------- | -------------------------- | --------------------------------------------------------------------------- |
| `collections`     | All collections tracked    | Per-collection configuration for which operations to track                  |
| `publishHandler` | -                          | Optional callback function called after changes are published               |

### Collection Configuration

You can configure tracking per collection:

```typescript
smartCachPlugin({
  collections: {
    // Track all operations (create, update, delete)
    posts: ["create", "update", "delete"],
    
    // Track only updates
    categories: ["update"],
    
    // Disable tracking completely
    users: false,
    
    // Use default operations (create, update, delete)
    // If not specified, defaults to all operations
  },
})
```

## How It Works

1. **Change Tracking**: When documents are created, updated, or deleted, the plugin automatically adds them to a publish queue.

2. **Dependency Resolution**: When publishing, the plugin analyzes relationships between collections and invalidates cache tags for dependent documents.

3. **Cache Invalidation**: Uses Next.js `revalidateTag` to invalidate cache tags for affected collections.

4. **Publish Queue**: Changes are queued until you explicitly publish them, allowing you to batch invalidations.

## Example Usage

Here's a complete example showing how to integrate payload-smart-cache:

```typescript
// payload.config.ts
import { buildConfig } from "payload";
import { smartCachPlugin } from "payload-smart-cache";

import { Posts } from "./collections/Posts";
import { Categories } from "./collections/Categories";

export default buildConfig({
  collections: [Posts, Categories],
  plugins: [
    smartCachPlugin({
      collections: {
        posts: ["create", "update", "delete"],
        categories: ["update"], // Only track updates for categories
      },
      publishHandler: async (changes) => {
        // Optional: Send webhook, update external cache, etc.
        await fetch("https://api.example.com/webhook", {
          method: "POST",
          body: JSON.stringify(changes),
        });
      },
    }),
  ],
});
```

```typescript
// app/api/revalidate/route.ts
import { NextRequest, NextResponse } from "next/server";
import config from "@payload-config";
import { getPayload } from "payload";

export async function POST(request: NextRequest) {
  const payload = await getPayload({ config });
  
  const response = await fetch(
    `${process.env.PAYLOAD_API_URL}/cache-plugin/publish`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to publish changes" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
```

## API Endpoints

The plugin provides two endpoints:

### POST `/cache-plugin/publish`

Publishes all queued changes and invalidates cache tags.

**Response:**
- `200 OK` - Changes published successfully
- `200 OK` with message "No changes to publish" - Queue is empty

### GET `/cache-plugin/check`

Checks the status of the publish queue.

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
