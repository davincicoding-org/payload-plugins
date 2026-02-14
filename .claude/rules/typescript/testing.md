# TypeScript/JavaScript Testing

> This file extends [common/testing.md](../common/testing.md) with TypeScript/JavaScript specific content.

## Test Colocation

ALWAYS colocate test files next to the source files they test:

```
src/
  commands/
    init.ts
    init.test.ts      ← unit/integration tests live beside the source
    add.ts
    add.test.ts
  utils/
    config.ts
    config.test.ts
```

- Name test files `<module>.test.ts` (not `<module>.spec.ts`)
- NEVER place tests in a separate top-level `tests/` or `__tests__/` directory
- E2E tests are the only exception — place them in `e2e/` at the project root

## E2E Testing

Use **Playwright** as the E2E testing framework for critical user flows.

## Agent Support

- **e2e-runner** - Playwright E2E testing specialist
