# payload-clienthub

Automatic monthly invoicing with PDF generation, Swiss QR Bill support, and multi-language email delivery for Payload CMS.

[![npm version](https://img.shields.io/npm/v/payload-clienthub)](https://www.npmjs.com/package/payload-clienthub)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Overview

payload-clienthub adds a full invoicing workflow to Payload -- clients, services, and invoices are managed as collections. Recurring services are automatically detected when due, rendered as localized PDF invoices (with Swiss QR Bill support), and emailed to each client. A single endpoint processes all clients at once, so you can wire it up to a scheduler and forget about it.

**Features**

- **Client & service management** -- track clients, contacts, and one-time/monthly/yearly services.
- **PDF invoices** -- generated with itemized line items, company branding, and Swiss QR Bill payment slips for CH-based companies.
- **Multi-language** -- invoices and emails are localized in DE, FR, IT, and EN.
- **Batch endpoint** -- one endpoint processes all clients at once; authenticate with a shared secret to call it from any scheduler.

## Installation

```sh
pnpm add payload-clienthub
```

## Usage

```ts
// payload.config.ts
import { buildConfig } from 'payload';
import { clienthubPlugin } from 'payload-clienthub';

export default buildConfig({
  // ...
  plugins: [
    clienthubPlugin({
      cronSecret: process.env.CRON_SECRET!,
    }),
  ],
});
```

Trigger invoice generation for all clients by calling the batch endpoint (e.g. from a monthly scheduler):

```sh
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://your-app.com/api/plugin-invoices/process-all-clients
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `cronSecret` | `string` | — | Required. Shared secret used to authenticate batch requests via the `Authorization: Bearer` header. |
| `clientsCollectionSlug` | `CollectionSlug` | `'clients'` | Slug for the auto-created clients collection. |
| `servicesCollectionSlug` | `CollectionSlug` | `'services'` | Slug for the auto-created services collection. |
| `invoicesCollectionSlug` | `CollectionSlug` | `'invoices'` | Slug for the auto-created invoices collection. |
| `invoicePdfsCollectionSlug` | `CollectionSlug` | `'invoice-pdfs'` | Slug for the auto-created invoice PDFs upload collection. |
| `onError` | `(error: Error, context: { operation: string; metadata?: Record<string, unknown> }) => void` | `console.error` | Custom error handler called when PDF generation or email delivery fails. |

## Contributing

This plugin lives in the [payload-plugins](https://github.com/davincicoding-org/payload-plugins) monorepo.

### Development

```sh
pnpm install

# watch this plugin for changes
pnpm --filter payload-clienthub dev

# run the Payload dev app (in a second terminal)
pnpm --filter dev dev
```

The `dev/` directory is a Next.js + Payload app that imports plugins via `workspace:*` — use it to test changes locally.

### Code quality

- **Formatting & linting** — handled by [Biome](https://biomejs.dev/), enforced on commit via husky + lint-staged.
- **Commits** — must follow [Conventional Commits](https://www.conventionalcommits.org/) with a valid scope (e.g. `fix(payload-clienthub): ...`).
- **Changesets** — please include a [changeset](https://github.com/changesets/changesets) in your PR by running `pnpm release`.

### Issues & PRs

Bug reports and feature requests are welcome — [open an issue](https://github.com/davincicoding-org/payload-plugins/issues).

## License

MIT
