# Payload Plugins

A collection of open-source plugins for [Payload CMS](https://payloadcms.com).

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Repository structure

```
payload-plugins/
  common/              Shared build tooling, Vite config, and utilities
  sandbox/             Next.js + Payload dev app for local testing
  docs/                Project documentation
  packages/            Each subdirectory is a standalone published plugin
  plop-templates/      Scaffolding templates for new plugins
```

## Contributing

### Prerequisites

- Node.js `^18.20.2 || >=20.9.0`
- [pnpm](https://pnpm.io/) `^9 || ^10`

### Setup

```sh
git clone https://github.com/davincicoding-org/payload-plugins.git
cd payload-plugins
pnpm install
```

### Development

Each plugin has a `dev/` directory with a standalone Next.js + Payload app for isolated testing:

```sh
pnpm --filter payload-intl dev
```

A default admin user is seeded automatically:

- **Email:** `dev@test.com`
- **Password:** `test1234`

### Code quality

- **Formatting & linting** -- [Biome](https://biomejs.dev/), enforced on commit via husky + lint-staged.
- **Commits** -- [Conventional Commits](https://www.conventionalcommits.org/) with scoped package names (e.g. `fix(payload-intl): ...`).
- **Changesets** -- include a [changeset](https://github.com/changesets/changesets) in your PR by running `pnpm release`.

### Scaffold a new plugin

```sh
pnpm generate
```

This runs [Plop](https://plopjs.com/) to scaffold a new plugin with the standard package structure.

## License

[MIT](LICENSE) -- maintained by [DAVINCI CODING GmbH](https://davincicoding.ch).
