# Verification Flows — Design Spec

## Problem

The invitations plugin supports one flow: admin creates a user, plugin sends an invitation email, user sets a password and joins. This flow assumes camp (tenant) context exists at user creation time.

A new self-signup flow is needed where a user registers themselves and creates a new camp simultaneously. This flow differs: the user already has a password, needs a different email template, has no camp context for email branding, and should get a session cookie on verification without a password-setting step.

## Approach

Split responsibility (Option C): the plugin provides a generic **named verification flows** mechanism. The app orchestrates domain-specific logic (camp creation, activation).

## Plugin Config Changes

### New Type: `VerificationFlowConfig`

```ts
interface VerificationFlowConfig {
  emailSender: EmailSenderOption
  generateEmailHTML: (args: { req: PayloadRequest; verificationURL: string; user: TypedUser }) => string | Promise<string>
  generateEmailSubject: (args: { req: PayloadRequest; verificationURL: string; user: TypedUser }) => string | Promise<string>
  acceptInvitationURL: string | AcceptInvitationURLFn
}
```

### Extended `InvitationsPluginConfig`

```ts
interface InvitationsPluginConfig {
  // ... existing fields unchanged ...
  verificationFlows?: Record<string, VerificationFlowConfig>
}
```

## Flow Resolution

A new `resolveCreateFlow` utility returns a discriminated union, called once during the hook chain and stashed on `req.context`:

```ts
type CreateFlow =
  | { type: 'admin-invite' }
  | { type: 'verification-flow'; name: string; config: VerificationFlowConfig }
  | { type: 'direct-create' }
```

Resolution order:
1. `data._verificationFlow` set → look up in config. Throw `APIError` if not found. Return `verification-flow`.
2. `data._email` set → return `admin-invite`.
3. Otherwise → return `direct-create`.

### Hook Behavior by Flow

| Hook | `admin-invite` | `verification-flow` | `direct-create` |
|---|---|---|---|
| `autoGeneratePassword` | Fires | Skips | Skips |
| `setJoinedAt` | Skips | Skips | Fires |
| `disableVerificationEmail` | Fires if `emailSender` set | Fires | Skips |
| `sendInvitationEmail` | Fires with top-level config | Fires with flow config | Skips |

## Virtual Field: `_verificationFlow`

Added to the users collection by the plugin. Hidden from admin UI, not persisted to DB. The consumer passes it via the Local API:

```ts
await payload.create({
  collection: 'users',
  data: { email, password, _verificationFlow: 'self-signup', ... },
})
```

## New Endpoint: `verifyAndLogin`

`POST /invitations-plugin/verify-and-login`

Schema: `{ token: string }` — no password.

Logic:
1. Find user by `_verificationToken` → `INVALID_TOKEN` if not found
2. Return `ALREADY_ACCEPTED` if `_verified === true`
3. `payload.update` — set `_verified: true`, `joinedAt`
4. Re-save `_verificationToken` (same reason as `acceptInvite`)
5. Sign a JWT with `{ id, email, collection }` using `payload.secret`
6. `generatePayloadCookie` with that token
7. Return `AcceptInviteResult` (same shape as `acceptInvite`)

Exported as both a util and an endpoint.

## File Changes

### New Files

- `src/utils/resolve-create-flow.ts` — flow resolution utility
- `src/utils/verify-and-login.ts` — token-only verification + session minting
- `src/endpoints/verify-and-login.ts` — HTTP handler
- `src/fields/verification-flow-field.ts` — `_verificationFlow` virtual field

### Modified Files

| File | Change |
|---|---|
| `src/types.ts` | Add `VerificationFlowConfig`, `CreateFlow`, `verifyAndLoginSchema` |
| `src/index.ts` | Accept `verificationFlows`. Register field, endpoint, hook conditions. |
| `src/hooks/auto-generate-password.ts` | Use `flow.type === 'admin-invite'` instead of `data._email` |
| `src/hooks/set-joined-at.ts` | Skip when flow is `admin-invite` OR `verification-flow` |
| `src/hooks/disable-verification-email.ts` | No logic change; registration condition broadened in `index.ts` |
| `src/hooks/send-invitation-email.ts` | When `flow.type === 'verification-flow'`, use `flow.config` |
| `src/const.ts` | Add `VERIFY_AND_LOGIN_PATH` |

### Unchanged Files

`accept-invite.ts`, `get-invite-data.ts`, `InvitationPage.tsx`, `SetPasswordForm.tsx`, `HideAuthOnCreate.tsx`

## Public API Exports

New exports from plugin entry point:
- `verifyAndLogin` — util for programmatic use
- `VerificationFlowConfig` — type for consumer modules

## Consumer Integration (PlayaCMS)

### Plugin Config

```ts
invitationsPlugin({
  // Existing admin-invite config (unchanged)
  emailSender: async ({ req, user }) => {
    const camp = await getCampForUser(req, user)
    return { email: `noreply@${camp.slug}.playacms.com`, name: camp.name }
  },
  generateInvitationEmailHTML: async (req, url, user) => {
    const camp = await getCampForUser(req, user)
    return renderInviteEmail({ campName: camp.name, url })
  },
  generateInvitationEmailSubject: async (req, url, user) => {
    const camp = await getCampForUser(req, user)
    return `You've been invited to ${camp.name}`
  },
  acceptInvitationURL: ({ token, user, req }) => {
    const campSlug = user.camps?.[0]?.camp?.slug
    return `https://app.${campSlug}.playacms.com/onboarding?token=${token}`
  },

  // New
  verificationFlows: {
    'self-signup': {
      emailSender: { email: 'noreply@playacms.com', name: 'PlayaCMS' },
      generateEmailHTML: async ({ verificationURL, user }) =>
        renderSignupVerificationEmail({ url: verificationURL, firstName: user.firstName }),
      generateEmailSubject: async () => 'Verify your email to activate your camp',
      acceptInvitationURL: ({ token }) =>
        `https://playacms.com/verify?token=${token}`,
    },
  },
})
```

### User Creation (tRPC signup procedure)

```ts
export const signup = publicProcedure
  .input(signupSchema)
  .mutation(async ({ input, ctx }) => {
    const camp = await ctx.payload.create({
      collection: 'camps',
      data: {
        name: input.campName,
        slug: input.slug,
        status: 'pending',
      },
    })

    await ctx.payload.create({
      collection: 'users',
      data: {
        email: input.email,
        password: input.password,
        firstName: input.firstName,
        lastName: input.lastName,
        camps: [{ camp: camp.id, capabilities: ['manageCamp', 'manageUsers'] }],
        _verificationFlow: 'self-signup',
      },
    })

    return { success: true, message: 'Check your email to verify your account.' }
  })
```

### User Verification (tRPC procedure)

```ts
import { verifyAndLogin } from '@payload-plugins/invitations'

export const verifyEmail = publicProcedure
  .input(z.object({ token: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const result = await verifyAndLogin({
      payload: ctx.payload,
      token: input.token,
    })

    if (!result.success) {
      throw new TRPCError({
        code: result.error === 'ALREADY_ACCEPTED' ? 'CONFLICT' : 'BAD_REQUEST',
        message: result.error,
      })
    }

    // App-layer: activate the camp
    const camp = result.user.camps?.[0]?.camp
    if (camp && typeof camp === 'object') {
      await ctx.payload.update({
        collection: 'camps',
        id: camp.id,
        data: { status: 'active' },
      })
    }

    ctx.res.setHeader('Set-Cookie', result.rawCookie)

    return { success: true, redirectTo: `https://app.${camp?.slug}.playacms.com/admin` }
  })
```

## Error Handling

- `_verificationFlow` set to a name not in `verificationFlows` config → `APIError(400)` during create
- Invalid token on `verifyAndLogin` → `{ success: false, error: 'INVALID_TOKEN' }`
- Already verified token → `{ success: false, error: 'ALREADY_ACCEPTED' }`
