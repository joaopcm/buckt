# @buckt/auth

Better Auth configuration for authentication, organizations, billing, and API keys.

## Server

```ts
import { createAuth } from '@buckt/auth'

const auth = createAuth(db, {
  secret: '...',
  baseUrl: 'http://localhost:3000',
  stripeSecretKey: '...',
  stripeWebhookSecret: '...',
  resend, // Resend client instance
})
```

### Plugins

**Organization** — multi-org support with invitation emails via Resend.

**Stripe** — billing integration with three plans (free, pro, enterprise). Creates a Stripe customer on signup. Organization-scoped subscriptions with role-based authorization (owner/admin).

**API Key** — org-scoped API keys with `bkt` prefix for the Hono API.

### Email Flows

| Flow | Template | Expiry |
|---|---|---|
| Email verification | `VerifyEmailEmail` | 24 hours |
| Password reset | `ResetPasswordEmail` | 15 minutes |
| Org invitation | `InviteEmail` | — |

All emails rendered via `@buckt/emails` React Email templates, sent through Resend from `hi@transactional.buckt.dev`.

## Client

```ts
import { createAuthClient } from '@buckt/auth'

const authClient = createAuthClient('http://localhost:3000')
```

Returns a Better Auth React client with `organizationClient`, `stripeClient` (with subscription support), and `apiKeyClient` plugins.

## Exports

- `createAuth` — server-side auth factory
- `createAuthClient` — client-side auth factory
- `Auth` type — return type of `createAuth`
