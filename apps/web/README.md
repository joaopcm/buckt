# @buckt/web

Next.js 16 dashboard for managing buckets, files, API keys, and billing.

## Overview

- **Framework:** Next.js 16 (App Router)
- **Port:** 3000
- **Output:** standalone (for Railway)
- **UI:** shadcn/ui + Tailwind CSS 4
- **Auth:** Better Auth (email/password)

## Routes

### Auth (`(auth)` group)

| Path | Description |
|---|---|
| `/login` | Sign in |
| `/signup` | Create account |
| `/verify-email` | Email verification (+ callback) |
| `/forgot-password` | Request password reset |
| `/reset-password` | Set new password |
| `/invite/[invitationId]` | Accept org invitation |

### Dashboard (`(dashboard)` group)

All under `/org/[orgId]/`:

| Path | Description |
|---|---|
| `dashboard` | Overview and stats |
| `buckets` | Bucket list |
| `buckets/new` | Create bucket |
| `buckets/[id]` | Bucket detail, file browser, upload |
| `keys` | API key management |
| `keys/new` | Create API key |
| `billing` | Subscription and usage |
| `settings` | Org settings, member management |

### API routes

| Path | Description |
|---|---|
| `/api/auth/[...all]` | Better Auth endpoints |
| `/api/trpc/[trpc]` | tRPC endpoint |

## Authentication

Better Auth with email/password. Email verification required on signup (24h expiry). Password reset via email link (15min expiry). Sessions managed server-side via headers.

## Organizations

Multi-org support with an org switcher in the sidebar. Roles: owner, admin, member. Invitation system via email with role assignment.

## tRPC

Internal API communication via tRPC with React Query. 5 routers:

| Router | Description |
|---|---|
| `billing` | Subscription and usage queries |
| `buckets` | Bucket CRUD with cursor pagination |
| `files` | File list, upload, delete |
| `keys` | API key management |
| `org` | Organization and member management |

Procedure middleware types: `publicProcedure`, `protectedProcedure`, `orgProcedure`, `adminProcedure`, `ownerProcedure`.

tRPC routers use `@buckt/sdk` under the hood to call the Hono API.

## UI

- **Components:** shadcn/ui (with Base UI)
- **Styling:** Tailwind CSS 4, tailwind-merge, tw-animate-css
- **Icons:** Lucide React, HugeIcons
- **Toasts:** Sonner
- **Forms:** React Hook Form + Zod resolvers
- **URL state:** nuqs
- **Theming:** next-themes (dark mode)
- **Fonts:** DM Sans, JetBrains Mono

## Billing

Stripe integration via Better Auth Stripe plugin. Three plan tiers (free, pro, enterprise). Subscription management on the billing page. Organization-scoped billing with role-based authorization (owner/admin).

## Observability

- **Error tracking:** Sentry (client, server, edge configs via `@sentry/nextjs`)
- **Analytics:** PostHog
- **Logging:** Evlog with optional Axiom drain

## Environment Variables

### Server

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Auth encryption secret |
| `BETTER_AUTH_URL` | Yes | Auth base URL |
| `STRIPE_SECRET_KEY` | Yes | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `STRIPE_FREE_PRICE_ID` | Yes | Stripe price ID for free plan |
| `STRIPE_PRO_PRICE_ID` | Yes | Stripe price ID for pro plan |
| `STRIPE_ENTERPRISE_PRICE_ID` | Yes | Stripe price ID for enterprise plan |
| `API_URL` | Yes | Hono API base URL |
| `TRIGGER_SECRET_KEY` | Yes | Trigger.dev API key |
| `AWS_ACCESS_KEY_ID` | Yes | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS credentials |
| `AWS_REGION` | No | AWS region (default: us-east-1) |
| `RESEND_API_KEY` | Yes | Resend email service key |
| `SENTRY_DSN` | No | Sentry error tracking |
| `AXIOM_TOKEN` | No | Axiom log drain |
| `AXIOM_DATASET` | No | Axiom dataset (default: buckt-web) |

### Client

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Yes | Auth base URL (public) |
| `NEXT_PUBLIC_POSTHOG_KEY` | No | PostHog project key |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | PostHog host URL |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN (public) |

## Scripts

```bash
pnpm dev     # Start with Infisical secrets + next dev
pnpm build   # Next.js build
pnpm start   # Next.js production server
pnpm lint    # ESLint
```

## Deployment

Deployed on Railway with standalone output. The Railpack builder copies `.next/static` and `public` into the standalone output. Watch patterns include `apps/web/**`, `packages/db/**`, `packages/shared/**`, `packages/auth/**`.
