# Syncpack Setup Design

## Problem

Dependency consistency in the monorepo is enforced only by convention.
Issues like misplaced dependency categories (`zod` in `devDependencies`
vs `dependencies`), non-catalog versions, and Payload packages leaking
into plugin `dependencies` are not caught by any tooling.

## Solution

Add **syncpack** to enforce dependency rules across all workspace
packages, integrated into CI as a hard gate.

## Package Groups

| Group             | Glob                       | Role                        |
| ----------------- | -------------------------- | --------------------------- |
| Plugins           | `plugins/*/package.json`   | Published, strict rules     |
| Internal packages | `packages/*/package.json`  | Shared libs, catalog usage  |
| Sandbox           | `sandbox/package.json`     | Integration host, consumes  |

## Rules

### 1. Payload ecosystem must use catalog in devDependencies

All `@payloadcms/*`, `payload`, `next`, `react`, `react-dom`,
`@types/react`, `@types/react-dom`, and `typescript` must use
`catalog:payload-stack` when in `devDependencies`.

### 2. Shared libs must use default catalog

`zod` must use `catalog:` everywhere it appears.

### 3. Payload packages banned from plugin dependencies

Plugins must never ship `payload`, `@payloadcms/*`, `react`,
`react-dom`, or `next` as regular `dependencies`. These are peer deps
provided by the host app.

### 4. Version consistency

All packages using the same dependency must agree on version range
(enforced by catalog usage, caught by `sameRange`).

## CI Integration

Add `syncpack lint` to the `ci:check` script in root `package.json`
so it runs alongside Biome and `sort-package-json`.

## Out of Scope

- Phantom peer deps (declared but not imported) — needs `depcheck`
- Missing peer deps (imported but not declared) — needs `depcheck`
