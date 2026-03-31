# Buckt — Design Spec

## Overview

Platform for on-demand provisioned S3 buckets with custom domain support. Users sign up, create orgs, provision branded S3 buckets (e.g., `assets.acme.com`), and serve static files. Provisioning is automated via Terraform, executed by Trigger.dev workers.

## Stack

| Component | Technology |
|-----------|-----------|
| Monorepo | Turborepo |
| API | Hono (REST only, API key auth) |
| Dashboard | Next.js App Router + Shadcn UI + tRPC (internal) |
| Auth | Better Auth (sessions, orgs, Stripe plugin) |
| ORM | Drizzle + PostgreSQL |
| Job Queue | Trigger.dev |
| Infrastructure | Terraform (S3 + CloudFront + ACM) |
| SDK | Node.js (`@buckt/sdk`) |
| Hosting | Vercel (dashboard), AWS ECS (API) |

## Monorepo Structure

```
buckt/
├── apps/
│   ├── api/              # Hono REST API (ECS)
│   └── web/              # Next.js dashboard (Vercel)
├── packages/
│   ├── sdk/              # @buckt/sdk
│   ├── db/               # Drizzle schema, migrations, client
│   ├── auth/             # Better Auth config (used by web only)
│   └── shared/           # Shared types, constants, Zod validators
├── infra/
│   ├── modules/
│   │   ├── bucket/       # S3 bucket + policy
│   │   └── cdn/          # CloudFront + ACM cert
│   └── main.tf
├── turbo.json
├── package.json
└── tsconfig.json
```

## Architecture

### Auth Separation

- **Dashboard (`apps/web`):** Owns Better Auth — user login/signup, session management, org management, Stripe billing. Has internal tRPC router.
- **API (`apps/api`):** API key auth only. No sessions, no cookies. Pure resource API.
- **Bridge:** Dashboard's tRPC procedures resolve user session → org → system API key, then use `@buckt/sdk` to call the API. SDK is the single client for the API.

### System API Key

When an org is created, a system API key is auto-generated with full permissions. It's marked `system: true`, hidden from the UI, and can't be deleted. The dashboard uses this key server-side to call the API on behalf of authenticated users.

## Data Model

### Organizations (Better Auth)
Managed by Better Auth's organization plugin. Members have roles: `owner`, `admin`, `member`.

### Subscriptions (Better Auth Stripe Plugin)
- `plan`: free | pro | enterprise
- `status`: active | canceled | past_due
- `stripeCustomerId`, `stripeSubscriptionId`

### API Keys
- `id`, `orgId`, `name`, `hashedKey`
- `permissions[]`: `buckets:read`, `buckets:write`, `buckets:delete`, `files:read`, `files:write`, `files:delete`
- `system`: boolean (true = dashboard key, hidden from UI)
- `lastUsedAt`, `expiresAt`, `createdAt`

### Buckets
- `id`, `orgId`, `name`, `slug`
- `s3BucketName`, `region`
- `customDomain`, `cloudfrontDistributionId`, `acmCertArn`
- `status`: `pending` | `provisioning` | `active` | `failed` | `deleting`
- `dnsRecords`: JSON (CNAME records for cert validation + domain pointing)
- `provisioningJobId` (Trigger.dev run ID)
- `storageUsedBytes`, `bandwidthUsedBytes`
- `createdAt`, `updatedAt`

## Provisioning Flow

1. `POST /api/buckets` with `{ name, customDomain }` — validates request, checks plan limits, creates bucket with status `pending`
2. Triggers Trigger.dev job `provision-bucket`
3. Job runs Terraform steps:
   - Create S3 bucket with website hosting + bucket policy
   - Request ACM certificate for `customDomain` (us-east-1)
   - Store DNS validation records on bucket record
   - Poll for cert validation (user adds CNAME to their DNS)
   - Create CloudFront distribution with cert + S3 origin
   - Update bucket to `active`
4. Dashboard shows DNS records the user needs to configure, with verify/poll UI

**Terraform state:** S3 backend, keyed per bucket: `terraform/buckets/{bucketId}/terraform.tfstate`

**Deletion:** Trigger.dev job runs `terraform destroy` for that bucket's state.

## API Endpoints (REST)

```
POST   /api/buckets              # Create bucket
GET    /api/buckets              # List org's buckets
GET    /api/buckets/:id          # Bucket detail (includes DNS records when provisioning)
DELETE /api/buckets/:id          # Trigger deletion

PUT    /api/buckets/:id/files/*  # Upload file
GET    /api/buckets/:id/files/*  # Get file metadata
DELETE /api/buckets/:id/files/*  # Delete file
GET    /api/buckets/:id/files    # List files

POST   /api/keys                 # Create API key
GET    /api/keys                 # List keys (excludes system keys)
DELETE /api/keys/:id             # Revoke key

GET    /api/billing/usage        # Current storage + bandwidth usage
GET    /api/billing/subscription # Current plan info
```

All endpoints require `Authorization: Bearer bkt_...` header. Org is resolved from the API key.

## SDK

```ts
import { Buckt } from '@buckt/sdk'

const client = new Buckt({ apiKey: 'bkt_...' })

const bucket = await client.buckets.create({ name: 'Marketing', customDomain: 'assets.acme.com' })
const buckets = await client.buckets.list()
const detail = await client.buckets.get(bucket.id)
await client.buckets.delete(bucket.id)

await client.files.upload(bucket.id, 'logo.png', buffer)
await client.files.list(bucket.id)
await client.files.delete(bucket.id, 'logo.png')
```

## Dashboard Pages

- `/login`, `/signup` — Better Auth
- `/org/[orgId]/dashboard` — Overview (bucket count, storage, bandwidth)
- `/org/[orgId]/buckets` — Bucket list with status badges
- `/org/[orgId]/buckets/new` — Create bucket (name + domain)
- `/org/[orgId]/buckets/[id]` — Detail: status, DNS records, file browser, usage
- `/org/[orgId]/settings` — Org settings, members, API keys
- `/org/[orgId]/billing` — Plan, usage, invoices (Stripe portal)

### Dashboard tRPC

Internal tRPC router (not exposed externally). Each procedure:
1. Resolves user session via Better Auth
2. Gets org's system API key from DB
3. Uses `@buckt/sdk` to call the Hono API

## Pricing Model

| Tier | Buckets | Storage | Bandwidth/mo | Price |
|------|---------|---------|-------------|-------|
| Free | 1 | 1 GB | 10 GB | $0 |
| Pro | 10 | 100 GB | 1 TB | TBD |
| Enterprise | Unlimited | Custom | Custom | TBD |

Overage: metered billing via Stripe usage records for storage + bandwidth beyond plan limits.

### Usage Tracking
- **Storage:** Periodic Trigger.dev job scans S3 bucket sizes via CloudWatch metrics
- **Bandwidth:** CloudFront access logs aggregated by scheduled Trigger.dev job

## Infrastructure (Terraform)

### Per-bucket resources:
- S3 bucket with website hosting config + public read policy
- ACM certificate (us-east-1) with DNS validation
- CloudFront distribution with S3 origin + ACM cert

### Shared resources:
- Terraform state S3 bucket
- IAM roles/policies for the API to manage S3
- ECS cluster for the API

## RBAC

API key permissions:
- `buckets:read` — list/get buckets
- `buckets:write` — create buckets
- `buckets:delete` — delete buckets
- `files:read` — list/get files
- `files:write` — upload files
- `files:delete` — delete files

System keys have all permissions. User-created keys can be scoped to any subset.
