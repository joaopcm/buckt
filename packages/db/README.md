# @buckt/db

Drizzle ORM schema and database client for PostgreSQL 18. Uses UUIDv7 for primary keys.

## Schema

### Auth (managed by Better Auth)

| Table | Description |
|---|---|
| `user` | User accounts (email, name, stripeCustomerId) |
| `session` | Active sessions (token, expiresAt, userId) |
| `account` | Auth providers (providerId, password, tokens) |
| `verification` | Email verification and password reset tokens |

### Organizations

| Table | Description |
|---|---|
| `organization` | Orgs (name, slug, logo, stripeCustomerId) |
| `member` | Org membership (userId, organizationId, role) |
| `invitation` | Pending invitations (email, role, status, expiresAt) |

### Core

| Table | Description |
|---|---|
| `buckets` | Bucket resources with provisioning state, DNS records, CDN config, storage/bandwidth tracking, cache and optimization settings |
| `api_keys` | Hashed API keys with scoped permissions and optional expiry |

### Billing

| Table | Description |
|---|---|
| `subscription` | Stripe subscriptions (plan, status, period, seats) |

## Enums

- `bucket_status`: `pending`, `provisioning`, `active`, `failed`, `deleting`
- `bucket_visibility`: `public`, `private`
- `cache_preset`: `no-cache`, `short`, `standard`, `aggressive`, `immutable`
- `optimization_mode`: `none`, `light`, `balanced`, `maximum`

## Client

```ts
import { createDb } from '@buckt/db'

const db = createDb(process.env.DATABASE_URL)
```

`createDb` returns a typed Drizzle instance with the full schema loaded.

## Migrations

Managed by Drizzle Kit. Migration files live in `drizzle/`.

```bash
pnpm db:generate   # Generate new migration from schema changes
pnpm db:migrate    # Apply pending migrations
```

## Scripts

```bash
pnpm db:generate   # drizzle-kit generate
pnpm db:migrate    # drizzle-kit migrate
pnpm lint          # tsc --noEmit
```
