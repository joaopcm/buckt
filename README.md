# Buckt

Branded S3 buckets on demand. Provision S3 buckets with custom domains (e.g., `assets.acme.com`) through a simple API or dashboard.

## How it works

1. User signs up, creates an organization
2. Creates a bucket with a custom domain via the dashboard or SDK
3. Buckt provisions an S3 bucket + CloudFront distribution + ACM certificate via Terraform
4. User adds the provided CNAME records to their DNS
5. Once DNS propagates, files are served from their custom domain over HTTPS

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Dashboard   │────▶│   Hono API   │────▶│  Trigger.dev    │
│  (Next.js)   │     │  (REST)      │     │  (Terraform)    │
└─────────────┘     └──────────────┘     └─────────────────┘
       │                   │                      │
       │                   │                      ▼
       ▼                   ▼              ┌───────────────┐
  Better Auth         PostgreSQL          │  AWS           │
  (auth, orgs,        (Drizzle)           │  S3 + CF + ACM│
   Stripe)                                └───────────────┘
```

- **Dashboard** — Next.js app with Shadcn UI. Handles auth, org management, and billing via Better Auth. Uses an internal tRPC router that calls the API through the SDK.
- **API** — Hono REST API. API key auth only, no sessions. Manages buckets, files, and keys.
- **SDK** — `@buckt/sdk`. The single client for the API, used by both the dashboard and external consumers.
- **Provisioning** — Trigger.dev orchestrates Terraform to create S3 buckets, CloudFront distributions, and ACM certificates per bucket.

## Tech stack

| Component | Technology |
|-----------|-----------|
| Monorepo | Turborepo |
| API | Hono |
| Dashboard | Next.js, Shadcn UI, tRPC |
| Auth | Better Auth (orgs, Stripe plugin) |
| Database | PostgreSQL, Drizzle ORM |
| Job queue | Trigger.dev |
| Infrastructure | Terraform (S3, CloudFront, ACM) |
| SDK | Node.js (`@buckt/sdk`) |
| Linting | Biome, Ultracite |
| Testing | Vitest |

## Project structure

```
buckt/
├── apps/
│   ├── api/          # Hono REST API
│   └── web/          # Next.js dashboard
├── packages/
│   ├── sdk/          # @buckt/sdk
│   ├── db/           # Drizzle schema + migrations
│   ├── auth/         # Better Auth config
│   └── shared/       # Shared types, Zod validators
├── infra/
│   └── modules/
│       ├── bucket/   # S3 bucket + policy
│       └── cdn/      # CloudFront + ACM cert
└── docker-compose.yml
```

## Getting started

### Prerequisites

- Node.js 22+
- pnpm 9+
- Docker (for PostgreSQL)
- Terraform 1.5+ (for infrastructure provisioning)
- AWS account with credentials

### Setup

```bash
# Install dependencies
pnpm install

# Start PostgreSQL
docker compose up -d

# Copy environment variables
cp .env.example .env
# Fill in the values in .env

# Run database migrations
pnpm db:migrate

# Start development servers
pnpm dev
```

The API runs on `http://localhost:3001` and the dashboard on `http://localhost:3000`.

## SDK usage

```ts
import { Buckt } from '@buckt/sdk'

const client = new Buckt({ apiKey: 'bkt_...' })

// Create a bucket with a custom domain
const bucket = await client.buckets.create({
  name: 'Marketing Assets',
  customDomain: 'assets.acme.com'
})

// Upload a file
await client.files.upload(bucket.id, 'logo.png', buffer)

// List files
const files = await client.files.list(bucket.id)
```

## API

All endpoints require an API key via `Authorization: Bearer bkt_...` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/buckets` | Create a bucket |
| `GET` | `/api/buckets` | List buckets |
| `GET` | `/api/buckets/:id` | Get bucket details |
| `DELETE` | `/api/buckets/:id` | Delete a bucket |
| `PUT` | `/api/buckets/:id/files/*` | Upload a file |
| `GET` | `/api/buckets/:id/files` | List files |
| `GET` | `/api/buckets/:id/files/*` | Get file metadata |
| `DELETE` | `/api/buckets/:id/files/*` | Delete a file |
| `POST` | `/api/keys` | Create an API key |
| `GET` | `/api/keys` | List API keys |
| `DELETE` | `/api/keys/:id` | Revoke an API key |
| `GET` | `/api/billing/usage` | Get usage stats |
| `GET` | `/api/billing/subscription` | Get subscription info |

## License

Private.
