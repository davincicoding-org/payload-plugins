# Verification Flows Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the invitations plugin with named verification flows so consumers can define custom email/verification behavior for non-invite user creation paths (e.g., self-signup).

**Architecture:** A new `verificationFlows` config option maps flow names to email/URL configs. A `resolveCreateFlow` utility centralizes flow detection (admin-invite vs verification-flow vs direct-create) and hooks consult the result instead of checking `_email` independently. A new `verifyAndLogin` util/endpoint handles token-only verification without a password.

**Tech Stack:** TypeScript, Payload CMS hooks, Zod, Vitest

---

## File Structure

### New Files

| File | Responsibility |
|---|---|
| `src/utils/resolve-create-flow.ts` | Centralized flow resolution from hook data → discriminated union |
| `src/utils/resolve-create-flow.test.ts` | Unit tests for flow resolution |
| `src/utils/verify-and-login.ts` | Token-only verification: mark verified, set joinedAt, mint JWT, return cookie |
| `src/utils/verify-and-login.test.ts` | Unit tests for verify-and-login |
| `src/endpoints/verify-and-login.ts` | HTTP handler wrapping the util |

### Modified Files

| File | Change |
|---|---|
| `src/types.ts` | Add `VerificationFlowConfig`, `CreateFlow`, `verifyAndLoginSchema` |
| `src/const.ts` | Add `verifyAndLogin` endpoint config |
| `src/fields.ts` | Add `verificationFlowField` |
| `src/index.ts` | Accept `verificationFlows`, register field/endpoint/hooks |
| `src/hooks/auto-generate-password.ts` | Use `resolveCreateFlow` instead of `data._email` |
| `src/hooks/auto-generate-password.test.ts` | Add test for verification-flow case |
| `src/hooks/set-joined-at.ts` | Use `resolveCreateFlow` instead of `data._email` |
| `src/hooks/send-invitation-email.ts` | Branch on flow type to use flow-specific config |
| `src/hooks/disable-verification-email.ts` | No logic change (registration condition changes in index.ts) |

---

## Chunk 1: Types, Constants, and Flow Resolution

### Task 1: Add Types

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add `VerificationFlowConfig` and `CreateFlow` types, and `verifyAndLoginSchema`**

In `src/types.ts`, add after the existing `EmailSenderOption` type:

```ts
export interface VerificationFlowConfig {
  emailSender: EmailSenderOption;
  generateEmailHTML: (args: {
    req: PayloadRequest;
    verificationURL: string;
    user: TypedUser;
  }) => string | Promise<string>;
  generateEmailSubject: (args: {
    req: PayloadRequest;
    verificationURL: string;
    user: TypedUser;
  }) => string | Promise<string>;
  acceptInvitationURL: string | AcceptInvitationURLFn;
}

export type CreateFlow =
  | { type: 'admin-invite' }
  | { type: 'verification-flow'; name: string; config: VerificationFlowConfig }
  | { type: 'direct-create' };
```

Add after `acceptInviteSchema`:

```ts
export const verifyAndLoginSchema = z.object({
  token: z.string(),
});
```

- [ ] **Step 2: Commit**

```bash
git add plugins/invitations/src/types.ts
git commit -m "feat(invitations): add VerificationFlowConfig, CreateFlow types and verifyAndLoginSchema"
```

### Task 2: Add Constants

**Files:**
- Modify: `src/const.ts`

- [ ] **Step 1: Add verify-and-login endpoint config**

In `src/const.ts`, add to the `ENDPOINTS` object:

```ts
verifyAndLogin: {
  path: '/invitations-plugin/verify-and-login',
  method: 'post',
  input: verifyAndLoginSchema,
},
```

Import `verifyAndLoginSchema` from `'./types'` alongside the existing imports.

- [ ] **Step 2: Commit**

```bash
git add plugins/invitations/src/const.ts
git commit -m "feat(invitations): add verify-and-login endpoint config"
```

### Task 3: Add `_verificationFlow` Virtual Field

**Files:**
- Modify: `src/fields.ts`

- [ ] **Step 1: Add the field definition**

In `src/fields.ts`, add:

```ts
export const verificationFlowField: Field = {
  name: '_verificationFlow',
  type: 'text',
  access: { read: () => false, update: () => false },
  admin: { hidden: true, disableListColumn: true },
  hooks: {
    beforeChange: [({ value }) => undefined],
  },
  virtual: true,
};
```

- [ ] **Step 2: Commit**

```bash
git add plugins/invitations/src/fields.ts
git commit -m "feat(invitations): add _verificationFlow virtual field"
```

### Task 4: Implement `resolveCreateFlow`

**Files:**
- Create: `src/utils/resolve-create-flow.ts`
- Create: `src/utils/resolve-create-flow.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/resolve-create-flow.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import type { VerificationFlowConfig } from '../types';
import { resolveCreateFlow } from './resolve-create-flow';

const mockFlowConfig: VerificationFlowConfig = {
  emailSender: { email: 'test@test.com', name: 'Test' },
  generateEmailHTML: async () => '<p>test</p>',
  generateEmailSubject: async () => 'Test',
  acceptInvitationURL: 'https://example.com/verify',
};

describe('resolveCreateFlow', () => {
  test('returns admin-invite when _email is set', () => {
    const result = resolveCreateFlow({
      data: { _email: 'test@example.com' },
      verificationFlows: {},
    });
    expect(result).toEqual({ type: 'admin-invite' });
  });

  test('returns verification-flow when _verificationFlow matches a configured flow', () => {
    const result = resolveCreateFlow({
      data: { _verificationFlow: 'self-signup' },
      verificationFlows: { 'self-signup': mockFlowConfig },
    });
    expect(result).toEqual({
      type: 'verification-flow',
      name: 'self-signup',
      config: mockFlowConfig,
    });
  });

  test('throws APIError when _verificationFlow does not match any configured flow', () => {
    expect(() =>
      resolveCreateFlow({
        data: { _verificationFlow: 'typo' },
        verificationFlows: { 'self-signup': mockFlowConfig },
      }),
    ).toThrow('Unknown verification flow: "typo"');
  });

  test('throws APIError when _verificationFlow is set but no flows are configured', () => {
    expect(() =>
      resolveCreateFlow({
        data: { _verificationFlow: 'self-signup' },
        verificationFlows: undefined,
      }),
    ).toThrow();
  });

  test('returns direct-create when neither _email nor _verificationFlow is set', () => {
    const result = resolveCreateFlow({
      data: { email: 'test@example.com' },
      verificationFlows: {},
    });
    expect(result).toEqual({ type: 'direct-create' });
  });

  test('_verificationFlow takes precedence over _email when both set', () => {
    const result = resolveCreateFlow({
      data: { _email: 'test@example.com', _verificationFlow: 'self-signup' },
      verificationFlows: { 'self-signup': mockFlowConfig },
    });
    expect(result.type).toBe('verification-flow');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd plugins/invitations && pnpm test -- src/utils/resolve-create-flow.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `resolveCreateFlow`**

Create `src/utils/resolve-create-flow.ts`:

```ts
import { APIError } from 'payload';
import type { CreateFlow, VerificationFlowConfig } from '../types';

export function resolveCreateFlow({
  data,
  verificationFlows,
}: {
  data: Record<string, unknown>;
  verificationFlows: Record<string, VerificationFlowConfig> | undefined;
}): CreateFlow {
  const flowName = data._verificationFlow;

  if (typeof flowName === 'string') {
    const config = verificationFlows?.[flowName];
    if (!config) {
      throw new APIError(
        `Unknown verification flow: "${flowName}". ` +
          `Configured flows: ${verificationFlows ? Object.keys(verificationFlows).join(', ') : 'none'}`,
      );
    }
    return { type: 'verification-flow', name: flowName, config };
  }

  if (data._email) {
    return { type: 'admin-invite' };
  }

  return { type: 'direct-create' };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd plugins/invitations && pnpm test -- src/utils/resolve-create-flow.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/invitations/src/utils/resolve-create-flow.ts plugins/invitations/src/utils/resolve-create-flow.test.ts
git commit -m "feat(invitations): add resolveCreateFlow utility with tests"
```

---

## Chunk 2: Dependencies and Hook Refactoring

### Task 5: Add `jsonwebtoken` Dependency

`verifyAndLogin` (Chunk 3) imports `jsonwebtoken`. Install it before implementing.

- [ ] **Step 1: Check if `jsonwebtoken` is already available**

Payload uses `jsonwebtoken` internally. Check if it's already in the dependency tree:

Run: `cd plugins/invitations && node -e "require('jsonwebtoken')" 2>&1`

If available (no error), skip adding it — use it as an implicit dependency via Payload.

If not available, add it:

Run: `cd plugins/invitations && pnpm add jsonwebtoken && pnpm add -D @types/jsonwebtoken`

- [ ] **Step 2: Commit if dependency was added**

```bash
git add plugins/invitations/package.json pnpm-lock.yaml
git commit -m "chore(invitations): add jsonwebtoken dependency"
```

### Task 6: Refactor `autoGeneratePassword`

**Files:**
- Modify: `src/hooks/auto-generate-password.ts`
- Modify: `src/hooks/auto-generate-password.test.ts`

- [ ] **Step 1: Add test for verification-flow case (should skip)**

In `src/hooks/auto-generate-password.test.ts`, add:

```ts
test('returns data unchanged when _verificationFlow is set', () => {
  const data = { _verificationFlow: 'self-signup', email: 'test@example.com', password: 'real-pw' };
  const result = autoGeneratePassword({
    operation: 'create',
    data,
  } as any);

  expect(result).toBe(data);
  expect(result?.password).toBe('real-pw');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugins/invitations && pnpm test -- src/hooks/auto-generate-password.test.ts`
Expected: FAIL — the hook currently generates a random password for any create with `_email` absent, but doesn't check `_verificationFlow`. Wait — actually, this test has no `_email`, so the hook returns `data` unchanged (the guard is `!data?._email`). The test would PASS because without `_email`, the hook is a no-op. That's correct behavior — the hook should skip when `_verificationFlow` is set.

The real refactor here is changing the hook to use `resolveCreateFlow` instead of checking `_email` directly. This is a structural change for consistency, but behavior is preserved.

- [ ] **Step 3: Refactor the hook to use `resolveCreateFlow`**

The hook needs the `verificationFlows` config to call `resolveCreateFlow`. Convert it to a factory function.

**Important:** This hook runs during `beforeValidate` — the earliest hook in the chain. It resolves the flow and stashes the result on `req.context.createFlow` so that later hooks (especially `afterChange`, where `_verificationFlow` has been stripped from the doc) can read it without re-resolving.

```ts
import crypto from 'node:crypto';
import type { CollectionBeforeValidateHook } from 'payload';
import type { User } from '@/payload-types';
import type { VerificationFlowConfig } from '../types';
import { resolveCreateFlow } from '../utils/resolve-create-flow';

export function createAutoGeneratePasswordHook({
  verificationFlows,
}: {
  verificationFlows: Record<string, VerificationFlowConfig> | undefined;
}): CollectionBeforeValidateHook<User> {
  return ({ operation, data, req }) => {
    if (operation !== 'create' || !data) return data;

    const flow = resolveCreateFlow({ data, verificationFlows });

    // Stash on req.context so downstream hooks (afterChange) can read it.
    // _verificationFlow is a virtual field stripped before persistence,
    // so afterChange hooks cannot resolve the flow from the doc.
    req.context.createFlow = flow;

    if (flow.type !== 'admin-invite') return data;

    const password = crypto.randomBytes(32).toString('hex');

    return {
      ...data,
      email: data._email,
      password,
      'confirm-password': password,
    };
  };
}
```

- [ ] **Step 4: Update tests for factory pattern**

Update `src/hooks/auto-generate-password.test.ts` to import and call the factory:

```ts
import { describe, expect, test } from 'vitest';
import { createAutoGeneratePasswordHook } from './auto-generate-password';

const autoGeneratePassword = createAutoGeneratePasswordHook({
  verificationFlows: undefined,
});

describe('createAutoGeneratePasswordHook', () => {
  test('generates 64-char hex password on admin-invite create', () => {
    const data = { _email: 'test@example.com' };
    const result = autoGeneratePassword({
      operation: 'create',
      data,
    } as any);

    expect(result).toBeDefined();
    expect(result?.password).toMatch(/^[0-9a-f]{64}$/);
    expect(result?.['confirm-password']).toBe(result?.password);
  });

  test('sets email from _email', () => {
    const data = { _email: 'test@example.com' };
    const result = autoGeneratePassword({
      operation: 'create',
      data,
    } as any);

    expect(result?.email).toBe('test@example.com');
  });

  test('returns new object (immutability)', () => {
    const data = { _email: 'test@example.com' };
    const result = autoGeneratePassword({
      operation: 'create',
      data,
    } as any);

    expect(result).not.toBe(data);
  });

  test('returns data unchanged for non-create operations', () => {
    const data = { _email: 'test@example.com' };
    const result = autoGeneratePassword({
      operation: 'update',
      data,
    } as any);

    expect(result).toBe(data);
    expect(result).not.toHaveProperty('password');
  });

  test('returns data unchanged when _verificationFlow is set', () => {
    const hook = createAutoGeneratePasswordHook({
      verificationFlows: {
        'self-signup': {
          emailSender: { email: 'test@test.com', name: 'Test' },
          generateEmailHTML: async () => '',
          generateEmailSubject: async () => '',
          acceptInvitationURL: 'https://example.com/verify',
        },
      },
    });
    const data = { _verificationFlow: 'self-signup', email: 'test@example.com', password: 'real-pw' };
    const result = hook({ operation: 'create', data } as any);

    expect(result).toBe(data);
    expect(result?.password).toBe('real-pw');
  });

  test('returns data unchanged for direct-create (no _email, no _verificationFlow)', () => {
    const data = { email: 'test@example.com', password: 'pw' };
    const result = autoGeneratePassword({
      operation: 'create',
      data,
    } as any);

    expect(result).toBe(data);
  });
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd plugins/invitations && pnpm test -- src/hooks/auto-generate-password.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add plugins/invitations/src/hooks/auto-generate-password.ts plugins/invitations/src/hooks/auto-generate-password.test.ts
git commit -m "refactor(invitations): convert autoGeneratePassword to factory using resolveCreateFlow"
```

### Task 6: Refactor `setJoinedAt`

**Files:**
- Modify: `src/hooks/set-joined-at.ts`

- [ ] **Step 1: Refactor to factory using `resolveCreateFlow`**

The flow was already resolved and stashed on `req.context.createFlow` by `autoGeneratePassword` (which runs in `beforeValidate`, before this `beforeChange` hook). Read it from there instead of re-resolving.

```ts
import type { CollectionBeforeChangeHook } from 'payload';
import type { User } from '@/payload-types';
import type { CreateFlow } from '../types';

export const setJoinedAt: CollectionBeforeChangeHook<User> = ({
  operation,
  data,
  req,
}) => {
  if (operation !== 'create') return data;

  const flow = req.context.createFlow as CreateFlow | undefined;
  if (flow && flow.type !== 'direct-create') return data;

  return { ...data, joinedAt: new Date().toISOString() };
};
```

Note: This hook no longer needs the factory pattern since it reads from `req.context` instead of needing `verificationFlows` config. It stays a plain hook export.

- [ ] **Step 2: Commit**

```bash
git add plugins/invitations/src/hooks/set-joined-at.ts
git commit -m "refactor(invitations): convert setJoinedAt to factory using resolveCreateFlow"
```

### Task 7: Refactor `sendInvitationEmail` Hook

**Files:**
- Modify: `src/hooks/send-invitation-email.ts`

- [ ] **Step 1: Update factory to accept `verificationFlows` and branch on flow type**

The hook factory already accepts email config params. Extend it to also accept `verificationFlows`, and when the flow is `verification-flow`, use the flow's config instead of the top-level config.

```ts
import type {
  CollectionAfterChangeHook,
  PayloadRequest,
  TypedUser,
} from 'payload';
import type { CreateFlow, EmailSenderOption, VerificationFlowConfig } from '../types';
import { resolveEmailSender } from '../utils/resolve-email-sender';

export function createSendInvitationEmailHook({
  emailSender,
  generateInvitationEmailHTML,
  generateInvitationEmailSubject,
  resolveInvitationURL,
  verificationFlows,
}: {
  emailSender: EmailSenderOption | undefined;
  generateInvitationEmailHTML: (args: {
    req: PayloadRequest;
    invitationURL: string;
    user: TypedUser;
  }) => string | Promise<string>;
  generateInvitationEmailSubject: (args: {
    req: PayloadRequest;
    invitationURL: string;
    user: TypedUser;
  }) => string | Promise<string>;
  resolveInvitationURL: (args: {
    req: PayloadRequest;
    token: string;
    user: TypedUser;
  }) => Promise<string>;
}): CollectionAfterChangeHook {
  return async ({ collection, doc, operation, req }) => {
    if (operation !== 'create') return doc;

    const fullDoc = await req.payload.findByID({
      collection: collection.slug as 'users',
      id: doc.id,
      showHiddenFields: true,
      overrideAccess: true,
      depth: 1,
    });
    const token = fullDoc._verificationToken;
    if (!token) return doc;

    const user = { ...fullDoc, collection: collection.slug } as TypedUser;

    // Read flow from req.context — stashed by autoGeneratePassword in beforeValidate.
    // Cannot re-resolve from doc because _verificationFlow is a virtual field
    // stripped before persistence.
    const flow = (req.context.createFlow as CreateFlow | undefined) ?? { type: 'admin-invite' as const };

    let sender: { email: string; name: string };
    let html: string;
    let subject: string;

    if (flow.type === 'verification-flow') {
      sender = await resolveEmailSender({
        emailSender: flow.config.emailSender,
        req,
        user,
      });
      const verificationURL = await resolveFlowInvitationURL({
        acceptInvitationURL: flow.config.acceptInvitationURL,
        req,
        token,
        user,
      });
      html = await flow.config.generateEmailHTML({
        req,
        verificationURL,
        user,
      });
      subject = await flow.config.generateEmailSubject({
        req,
        verificationURL,
        user,
      });
    } else if (flow.type === 'admin-invite' && emailSender) {
      sender = await resolveEmailSender({ emailSender, req, user });
      const invitationURL = await resolveInvitationURL({ req, token, user });
      html = await generateInvitationEmailHTML({ req, invitationURL, user });
      subject = await generateInvitationEmailSubject({
        req,
        invitationURL,
        user,
      });
    } else {
      return doc;
    }

    await req.payload.sendEmail({
      from: `"${sender.name}" <${sender.email}>`,
      to: doc.email,
      subject,
      html,
    });

    return doc;
  };
}
```

Note: `resolveFlowInvitationURL` is a helper to resolve a `VerificationFlowConfig.acceptInvitationURL` (string or function) — extract it or inline it. The simplest approach is to reuse the same pattern from `index.ts`:

```ts
async function resolveFlowInvitationURL({
  acceptInvitationURL,
  req,
  token,
  user,
}: {
  acceptInvitationURL: string | ((args: { token: string; user: TypedUser; req: PayloadRequest; defaultURL: string }) => string | Promise<string>);
  req: PayloadRequest;
  token: string;
  user: TypedUser;
}): Promise<string> {
  if (typeof acceptInvitationURL === 'string') {
    const separator = acceptInvitationURL.includes('?') ? '&' : '?';
    return `${acceptInvitationURL}${separator}token=${token}`;
  }
  return acceptInvitationURL({ token, user, req, defaultURL: '' });
}
```

Add this as a private function in the same file.

- [ ] **Step 2: Commit**

```bash
git add plugins/invitations/src/hooks/send-invitation-email.ts
git commit -m "refactor(invitations): extend sendInvitationEmail hook to support verification flows"
```

---

## Chunk 3: `verifyAndLogin` Util and Endpoint

### Task 8: Implement `verifyAndLogin`

**Files:**
- Create: `src/utils/verify-and-login.ts`
- Create: `src/utils/verify-and-login.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/verify-and-login.test.ts`:

```ts
import type { Payload } from 'payload';
import { describe, expect, test, vi } from 'vitest';
import { verifyAndLogin } from './verify-and-login';

function createMockPayload(
  overrides: {
    findDocs?: Record<string, unknown>[];
    adminUser?: string;
    secret?: string;
  } = {},
): Payload {
  const {
    findDocs = [],
    adminUser = 'users',
    secret = 'test-secret',
  } = overrides;
  return {
    config: {
      admin: { user: adminUser },
      cookiePrefix: 'payload',
    },
    secret,
    collections: {
      [adminUser]: {
        config: {
          auth: { tokenExpiration: 7200 },
        },
      },
    },
    find: vi.fn().mockResolvedValue({ docs: findDocs }),
    update: vi.fn().mockResolvedValue({}),
  } as unknown as Payload;
}

vi.mock('payload', async (importOriginal) => {
  const mod = await importOriginal<typeof import('payload')>();
  return {
    ...mod,
    generatePayloadCookie: vi.fn(
      () =>
        'payload-token=jwt-token; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=7200',
    ),
  };
});

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'signed-jwt-token'),
  },
}));

describe('verifyAndLogin', () => {
  test('returns INVALID_TOKEN when no user found', async () => {
    const payload = createMockPayload({ findDocs: [] });
    const result = await verifyAndLogin({ token: 'bad', payload });
    expect(result).toEqual({ success: false, error: 'INVALID_TOKEN' });
  });

  test('returns ALREADY_ACCEPTED when user is verified', async () => {
    const payload = createMockPayload({
      findDocs: [{ id: '1', email: 'test@test.com', _verified: true }],
    });
    const result = await verifyAndLogin({ token: 'used', payload });
    expect(result).toEqual({ success: false, error: 'ALREADY_ACCEPTED' });
  });

  test('verifies user, sets joinedAt, and returns cookie without requiring password', async () => {
    const payload = createMockPayload({
      findDocs: [{ id: '1', email: 'test@test.com', _verified: false }],
    });

    const result = await verifyAndLogin({ token: 'valid', payload });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.token).toBe('signed-jwt-token');
      expect(result.cookie).toHaveProperty('name');
      expect(result.rawCookie).toContain('payload-token');
    }

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          _verified: true,
          joinedAt: expect.any(String),
        }),
      }),
    );

    // Should NOT have a password in the update call
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          password: expect.anything(),
        }),
      }),
    );
  });

  test('re-saves _verificationToken after verification', async () => {
    const payload = createMockPayload({
      findDocs: [{ id: '1', email: 'test@test.com', _verified: false }],
    });

    await verifyAndLogin({ token: 'valid', payload });

    // Second update call re-saves the token
    expect(payload.update).toHaveBeenCalledTimes(2);
    expect(payload.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: { _verificationToken: 'valid' },
      }),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd plugins/invitations && pnpm test -- src/utils/verify-and-login.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `verifyAndLogin`**

Create `src/utils/verify-and-login.ts`:

```ts
import jwt from 'jsonwebtoken';
import type { Payload } from 'payload';
import { type AcceptInviteResult, cookieStringSchema } from '../types';

export async function verifyAndLogin({
  token,
  payload,
}: {
  token: string;
  payload: Payload;
}): Promise<AcceptInviteResult> {
  const usersCollection = payload.config.admin.user as 'users';

  const {
    docs: [user],
  } = await payload.find({
    collection: usersCollection,
    where: { _verificationToken: { equals: token } },
    overrideAccess: true,
    limit: 1,
  });

  if (!user) return { success: false, error: 'INVALID_TOKEN' };

  if (user._verified) return { success: false, error: 'ALREADY_ACCEPTED' };

  await payload.update({
    collection: usersCollection,
    id: user.id,
    overrideAccess: true,
    data: { _verified: true, joinedAt: new Date().toISOString() },
  });

  // Re-save _verificationToken — Payload clears it when _verified becomes true.
  // Keeping it allows getInviteData to identify the user on repeat visits.
  await payload.update({
    collection: usersCollection,
    id: user.id,
    overrideAccess: true,
    data: { _verificationToken: token },
  });

  const authConfig = payload.collections[usersCollection].config.auth;
  const tokenExpiration =
    typeof authConfig === 'object' && 'tokenExpiration' in authConfig
      ? (authConfig.tokenExpiration ?? 7200)
      : 7200;

  const jwtToken = jwt.sign(
    { id: user.id, email: user.email, collection: usersCollection },
    payload.secret,
    { expiresIn: tokenExpiration },
  );

  const { generatePayloadCookie } = await import('payload');
  const cookieString = generatePayloadCookie({
    collectionAuthConfig: authConfig,
    cookiePrefix: payload.config.cookiePrefix,
    token: jwtToken,
  });

  return {
    success: true,
    user: { ...user, collection: usersCollection } as any,
    token: jwtToken,
    cookie: cookieStringSchema.parse(cookieString),
    rawCookie: cookieString,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd plugins/invitations && pnpm test -- src/utils/verify-and-login.test.ts`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/invitations/src/utils/verify-and-login.ts plugins/invitations/src/utils/verify-and-login.test.ts
git commit -m "feat(invitations): add verifyAndLogin util with tests"
```

### Task 9: Add `verifyAndLogin` Endpoint

**Files:**
- Create: `src/endpoints/verify-and-login.ts`

- [ ] **Step 1: Implement the endpoint handler**

Create `src/endpoints/verify-and-login.ts`:

```ts
import { createEndpointHandler } from '@davincicoding/payload-plugin-kit/server';
import { ENDPOINTS } from '../const';
import { verifyAndLogin } from '../utils/verify-and-login';

export const verifyAndLoginEndpoint = createEndpointHandler(
  ENDPOINTS.verifyAndLogin,
  async (req, { token }) => {
    const result = await verifyAndLogin({
      token,
      payload: req.payload,
    });

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json(
      { success: true, user: result.user },
      { headers: { 'Set-Cookie': result.rawCookie } },
    );
  },
);
```

- [ ] **Step 2: Commit**

```bash
git add plugins/invitations/src/endpoints/verify-and-login.ts
git commit -m "feat(invitations): add verify-and-login endpoint"
```

---

## Chunk 4: Wire Everything in Plugin Entry Point

### Task 10: Update `index.ts`

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add `verificationFlows` to `InvitationsPluginConfig`**

Add to the interface:

```ts
/**
 * Named verification flows for non-invite user creation paths.
 *
 * Each flow defines its own email sender, template, and verification URL.
 * The consumer triggers a flow by passing `_verificationFlow: '<name>'`
 * during `payload.create`.
 */
verificationFlows?: Record<string, VerificationFlowConfig>;
```

Import `VerificationFlowConfig` from `'./types'`.

- [ ] **Step 2: Re-export new types and utils**

Add to the exports:

```ts
export type { VerificationFlowConfig } from './types';
export { verifyAndLogin } from './utils/verify-and-login';
```

- [ ] **Step 3: Destructure `verificationFlows` from config and pass to hook factories**

In the plugin function, destructure `verificationFlows` from the config. Replace direct hook references with factory calls:

```ts
// Replace:
collection.hooks.beforeValidate.push(autoGeneratePassword);
// With:
collection.hooks.beforeValidate.push(
  createAutoGeneratePasswordHook({ verificationFlows }),
);

// setJoinedAt stays a plain hook (reads flow from req.context, no factory needed).
// No change needed for this line.
```

- [ ] **Step 4: Register `_verificationFlow` field**

After pushing `hideAuthOnCreateField`:

```ts
collection.fields.push(verificationFlowField);
```

- [ ] **Step 5: Broaden `disableVerificationEmail` registration condition**

Change from:

```ts
if (emailSender) {
```

To:

```ts
if (emailSender || verificationFlows) {
```

- [ ] **Step 6: Update `sendInvitationEmail` hook registration**

The hook should be registered when either `emailSender` or `verificationFlows` is set. Pass both to the factory:

```ts
if (emailSender || verificationFlows) {
  collection.hooks.beforeOperation ??= [];
  collection.hooks.beforeOperation.push(disableVerificationEmail);
  collection.hooks.afterChange ??= [];
  collection.hooks.afterChange.push(
    createSendInvitationEmailHook({
      emailSender,
      generateInvitationEmailHTML,
      generateInvitationEmailSubject,
      resolveInvitationURL,
    }),
  );
}
```

- [ ] **Step 7: Register `verifyAndLogin` endpoint**

After pushing `acceptInviteEndpoint`:

```ts
config.endpoints.push(verifyAndLoginEndpoint);
```

- [ ] **Step 8: Run type check**

Run: `cd plugins/invitations && pnpm check:types`
Expected: No errors

- [ ] **Step 9: Run all unit tests**

Run: `cd plugins/invitations && pnpm test`
Expected: All tests PASS

- [ ] **Step 10: Commit**

```bash
git add plugins/invitations/src/index.ts plugins/invitations/src/fields.ts
git commit -m "feat(invitations): wire verificationFlows into plugin entry point"
```

---

## Chunk 5: Final Verification

### Task 11: Full Build and Test

- [ ] **Step 1: Run full type check**

Run: `cd plugins/invitations && pnpm check:types`
Expected: No errors

- [ ] **Step 2: Run all unit tests**

Run: `cd plugins/invitations && pnpm test`
Expected: All tests PASS

- [ ] **Step 3: Run lint**

Run: `cd plugins/invitations && pnpm lint`
Expected: No errors (or fix any that appear)

- [ ] **Step 4: Run build**

Run: `cd plugins/invitations && pnpm build`
Expected: Build succeeds

- [ ] **Step 5: Final commit if any lint/build fixes were needed**

```bash
git add -A plugins/invitations/
git commit -m "chore(invitations): fix lint/build issues from verification flows implementation"
```
