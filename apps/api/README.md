# @buckt/api

Hono REST API + Trigger.dev background tasks for bucket provisioning, file management, and usage aggregation.

## Overview

- **Framework:** Hono
- **Port:** 3001
- **Route prefix:** `/v1`
- **Auth:** API key (`Bearer bkt_...`)
- **Build:** tsup (ESM)

## Routes

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/health` | — | Health check |
| `POST` | `/v1/buckets` | `buckets:write` | Create bucket |
| `GET` | `/v1/buckets` | `buckets:read` | List buckets |
| `GET` | `/v1/buckets/:id` | `buckets:read` | Get bucket |
| `PATCH` | `/v1/buckets/:id` | `buckets:write` | Update bucket |
| `DELETE` | `/v1/buckets/:id` | `buckets:delete` | Delete bucket |
| `POST` | `/v1/buckets/:id/retry` | `buckets:write` | Retry provisioning |
| `PUT` | `/v1/buckets/:bucketId/files/*` | `files:write` | Upload file |
| `GET` | `/v1/buckets/:bucketId/files` | `files:read` | List files |
| `GET` | `/v1/buckets/:bucketId/files/*` | `files:read` | Get file metadata |
| `DELETE` | `/v1/buckets/:bucketId/files/*` | `files:delete` | Delete file |
| `POST` | `/v1/keys` | `keys:write` | Create API key |
| `GET` | `/v1/keys` | `keys:read` | List API keys |
| `DELETE` | `/v1/keys/:id` | `keys:write` | Revoke API key |
| `GET` | `/v1/billing/usage` | any | Get usage stats |
| `GET` | `/v1/billing/subscription` | any | Get subscription |

## Middleware

Applied in order:

1. **Timeout** — 10s request timeout
2. **Request ID** — generates/propagates `X-Request-ID`
3. **Evlog** — structured logging with optional Axiom drain
4. **Auth** (`requireAuth`) — validates API key (SHA-256 hash lookup), checks permission, updates `lastUsedAt`
5. **Rate Limit** — Redis sliding window, plan-based limits per 60s window. Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
6. **Plan** (`requirePlan`) — loads subscription and plan limits into request context

## Authentication

API keys use the `bkt_` prefix. Keys are hashed with SHA-256 and stored in the database. Each key has scoped permissions:

`buckets:read` `buckets:write` `buckets:delete` `files:read` `files:write` `files:delete` `keys:read` `keys:write`

Keys can have an optional `expiresAt` date.

## Background Jobs

Trigger.dev v4 tasks in `src/trigger/`:

| Task | Schedule | Description |
|---|---|---|
| `provision-bucket` | on-demand | Creates S3 bucket, website config, CORS, lifecycle rules, ACM certificate |
| `destroy-bucket` | on-demand | Disables/deletes CloudFront, deletes ACM cert, empties and deletes S3 bucket |
| `optimize-file` | on-demand | Downloads image from S3, compresses with Sharp, re-uploads if smaller |
| `aggregate-storage` | daily 02:00 UTC | Reads CloudWatch `BucketSizeBytes` metric, updates DB, reports to Stripe |
| `aggregate-bandwidth` | daily 03:00 UTC | Parses CloudFront access logs from S3, updates DB, reports to Stripe |
| `check-cert-validation` | every 5 min | Checks pending ACM certs, creates CloudFront distribution when issued, marks failed after 72h |

## AWS Setup

### CloudFront Access Logging

Required for bandwidth tracking. One-time setup:

1. Go to **S3 Console** (us-east-1) > Create bucket
   - Name: `buckt-cloudfront-logs`
   - Region: us-east-1
   - Object Ownership: **ACLs enabled** > **Bucket owner preferred**

2. Open the bucket > **Permissions** > **Access control list (ACL)** > Edit
   - S3 log delivery group > **Objects: Write**, **Bucket ACL: Read**

3. Add env vars (Infisical):
   - `CLOUDFRONT_LOG_BUCKET` = `buckt-cloudfront-logs`
   - `CLOUDFRONT_LOG_PREFIX` = `cf-logs/`

4. Redeploy Trigger.dev tasks

New CloudFront distributions will have logging enabled automatically. For existing distributions, enable logging manually in the CloudFront console (Edit > Standard logging > On > select bucket + set prefix to `cf-logs/{domain}/`).

### CAA Records

Users must add a CAA record to their domain's DNS to allow Amazon to issue SSL certificates:

```
Type:  CAA
Name:  <root-domain>
Value: 0 issue "amazon.com"
```

This is shown in the dashboard provisioning steps.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `AWS_ACCESS_KEY_ID` | Yes | — | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | Yes | — | AWS credentials |
| `AWS_REGION` | No | `us-east-1` | AWS region |
| `STRIPE_SECRET_KEY` | Yes | — | Stripe API key |
| `STRIPE_METERED_STORAGE_PRICE_ID` | No | — | Stripe metered storage price |
| `STRIPE_METERED_BANDWIDTH_PRICE_ID` | No | — | Stripe metered bandwidth price |
| `CLOUDFRONT_LOG_BUCKET` | No | — | S3 bucket for CloudFront logs |
| `CLOUDFRONT_LOG_PREFIX` | No | `cf-logs/` | Prefix for CloudFront log objects |
| `REDIS_URL` | Yes | — | Redis connection string |
| `TRIGGER_SECRET_KEY` | Yes | — | Trigger.dev API key |
| `SENTRY_DSN` | No | — | Sentry error tracking |
| `AXIOM_TOKEN` | No | — | Axiom log drain |
| `AXIOM_DATASET` | No | `buckt-api` | Axiom dataset name |
| `PORT` | No | `3001` | Server port |

## Scripts

```bash
pnpm dev           # Start with Infisical secrets + tsx watch
pnpm build         # Build with tsup
pnpm start         # Run dist/index.js
pnpm lint          # Type check (tsc --noEmit)
pnpm test          # Run tests (vitest)
pnpm trigger:dev   # Start Trigger.dev dev server
```
