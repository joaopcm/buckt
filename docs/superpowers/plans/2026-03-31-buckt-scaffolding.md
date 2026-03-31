# Buckt — Project Scaffolding & Milestone Issues

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Turborepo monorepo with all apps/packages/infra stubs, then create GitHub issues for each milestone with detailed descriptions.

**Architecture:** Turborepo monorepo with apps (api, web), packages (sdk, db, auth, shared), and infra (Terraform modules). Each milestone issue covers one vertical slice of the system.

**Tech Stack:** Turborepo, TypeScript, Hono, Next.js, Drizzle, Better Auth, Terraform, Trigger.dev

---

### Task 1: Initialize Turborepo monorepo

**Files:**
- Create: `package.json`
- Create: `turbo.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `.nvmrc`

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/jopcmelo/Developer/personal/branded-s3-provisioner
git init
```

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "buckt",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "db:generate": "turbo db:generate",
    "db:migrate": "turbo db:migrate"
  },
  "devDependencies": {
    "turbo": "^2",
    "typescript": "^5.7"
  },
  "packageManager": "pnpm@9.15.0"
}
```

- [ ] **Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {},
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    }
  }
}
```

- [ ] **Step 4: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
.next/
.turbo/
.env
.env.local
*.tfstate
*.tfstate.backup
.terraform/
```

- [ ] **Step 6: Create .nvmrc**

```
22
```

- [ ] **Step 7: Install dependencies**

```bash
pnpm install
```

- [ ] **Step 8: Commit**

```bash
git add package.json turbo.json tsconfig.json .gitignore .nvmrc pnpm-lock.yaml
git commit -m "init turborepo monorepo"
```

---

### Task 2: Scaffold packages/shared

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Create packages/shared/package.json**

```json
{
  "name": "@buckt/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "tsc --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "vitest": "^3"
  },
  "dependencies": {
    "zod": "^3"
  }
}
```

- [ ] **Step 2: Create packages/shared/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create packages/shared/src/index.ts**

```ts
export {}
```

- [ ] **Step 4: Install and commit**

```bash
pnpm install
git add packages/shared/
git commit -m "scaffold packages/shared"
```

---

### Task 3: Scaffold packages/db

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/src/index.ts`
- Create: `packages/db/src/schema/index.ts`
- Create: `packages/db/drizzle.config.ts`

- [ ] **Step 1: Create packages/db/package.json**

```json
{
  "name": "@buckt/db",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "drizzle-orm": "^0.40",
    "postgres": "^3",
    "@buckt/shared": "workspace:*"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30",
    "typescript": "^5.7"
  }
}
```

- [ ] **Step 2: Create packages/db/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create packages/db/drizzle.config.ts**

```ts
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

- [ ] **Step 4: Create packages/db/src/schema/index.ts**

```ts
export {}
```

- [ ] **Step 5: Create packages/db/src/index.ts**

```ts
export * from "./schema"
```

- [ ] **Step 6: Install and commit**

```bash
pnpm install
git add packages/db/
git commit -m "scaffold packages/db"
```

---

### Task 4: Scaffold packages/auth

**Files:**
- Create: `packages/auth/package.json`
- Create: `packages/auth/tsconfig.json`
- Create: `packages/auth/src/index.ts`

- [ ] **Step 1: Create packages/auth/package.json**

```json
{
  "name": "@buckt/auth",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "better-auth": "^1",
    "@buckt/db": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.7"
  }
}
```

- [ ] **Step 2: Create packages/auth/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create packages/auth/src/index.ts**

```ts
export {}
```

- [ ] **Step 4: Install and commit**

```bash
pnpm install
git add packages/auth/
git commit -m "scaffold packages/auth"
```

---

### Task 5: Scaffold packages/sdk

**Files:**
- Create: `packages/sdk/package.json`
- Create: `packages/sdk/tsconfig.json`
- Create: `packages/sdk/src/index.ts`

- [ ] **Step 1: Create packages/sdk/package.json**

```json
{
  "name": "@buckt/sdk",
  "version": "0.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "lint": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@buckt/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.7",
    "vitest": "^3"
  }
}
```

- [ ] **Step 2: Create packages/sdk/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create packages/sdk/src/index.ts**

```ts
export {}
```

- [ ] **Step 4: Install and commit**

```bash
pnpm install
git add packages/sdk/
git commit -m "scaffold packages/sdk"
```

---

### Task 6: Scaffold apps/api

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/src/index.ts`

- [ ] **Step 1: Create apps/api/package.json**

```json
{
  "name": "@buckt/api",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "hono": "^4",
    "@hono/node-server": "^1",
    "@buckt/db": "workspace:*",
    "@buckt/shared": "workspace:*",
    "zod": "^3"
  },
  "devDependencies": {
    "tsx": "^4",
    "typescript": "^5.7",
    "vitest": "^3"
  }
}
```

- [ ] **Step 2: Create apps/api/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create apps/api/src/index.ts**

```ts
import { Hono } from "hono"
import { serve } from "@hono/node-server"

const app = new Hono()

app.get("/health", (c) => c.json({ status: "ok" }))

serve({ fetch: app.fetch, port: 3001 }, (info) => {
  console.log(`Buckt API running on port ${info.port}`)
})

export default app
```

- [ ] **Step 4: Install and commit**

```bash
pnpm install
git add apps/api/
git commit -m "scaffold apps/api with hono"
```

---

### Task 7: Scaffold apps/web

**Files:**
- Create: `apps/web/` (via create-next-app)

- [ ] **Step 1: Create Next.js app**

```bash
cd /Users/jopcmelo/Developer/personal/branded-s3-provisioner
pnpm dlx create-next-app@latest apps/web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --no-turbopack
```

- [ ] **Step 2: Add workspace dependencies to apps/web/package.json**

Add these to the `dependencies` section:

```json
"@buckt/sdk": "workspace:*",
"@buckt/shared": "workspace:*",
"@buckt/auth": "workspace:*",
"@buckt/db": "workspace:*"
```

- [ ] **Step 3: Install Shadcn**

```bash
cd /Users/jopcmelo/Developer/personal/branded-s3-provisioner/apps/web
pnpm dlx shadcn@latest init -d
```

- [ ] **Step 4: Install tRPC dependencies**

```bash
cd /Users/jopcmelo/Developer/personal/branded-s3-provisioner/apps/web
pnpm add @trpc/server @trpc/client @trpc/react-query @tanstack/react-query
```

- [ ] **Step 5: Install and commit**

```bash
cd /Users/jopcmelo/Developer/personal/branded-s3-provisioner
pnpm install
git add apps/web/
git commit -m "scaffold apps/web with next.js, shadcn, trpc"
```

---

### Task 8: Scaffold infra/ (Terraform)

**Files:**
- Create: `infra/main.tf`
- Create: `infra/variables.tf`
- Create: `infra/modules/bucket/main.tf`
- Create: `infra/modules/bucket/variables.tf`
- Create: `infra/modules/bucket/outputs.tf`
- Create: `infra/modules/cdn/main.tf`
- Create: `infra/modules/cdn/variables.tf`
- Create: `infra/modules/cdn/outputs.tf`

- [ ] **Step 1: Create infra/main.tf**

```hcl
terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {}
}

provider "aws" {
  region = var.aws_region
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
```

- [ ] **Step 2: Create infra/variables.tf**

```hcl
variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "bucket_name" {
  type = string
}

variable "custom_domain" {
  type = string
}
```

- [ ] **Step 3: Create infra/modules/bucket/main.tf**

```hcl
resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_website_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  index_document {
    suffix = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "this" {
  bucket = aws_s3_bucket.this.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.this.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.this]
}
```

- [ ] **Step 4: Create infra/modules/bucket/variables.tf**

```hcl
variable "bucket_name" {
  type = string
}
```

- [ ] **Step 5: Create infra/modules/bucket/outputs.tf**

```hcl
output "bucket_arn" {
  value = aws_s3_bucket.this.arn
}

output "bucket_regional_domain_name" {
  value = aws_s3_bucket.this.bucket_regional_domain_name
}

output "website_endpoint" {
  value = aws_s3_bucket_website_configuration.this.website_endpoint
}
```

- [ ] **Step 6: Create infra/modules/cdn/main.tf**

```hcl
resource "aws_acm_certificate" "this" {
  provider          = aws.us_east_1
  domain_name       = var.custom_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  aliases             = [var.custom_domain]
  default_root_object = "index.html"

  origin {
    domain_name = var.s3_website_endpoint
    origin_id   = "S3Origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3Origin"
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.this.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  depends_on = [aws_acm_certificate.this]
}
```

- [ ] **Step 7: Create infra/modules/cdn/variables.tf**

```hcl
variable "custom_domain" {
  type = string
}

variable "s3_website_endpoint" {
  type = string
}
```

- [ ] **Step 8: Create infra/modules/cdn/outputs.tf**

```hcl
output "distribution_id" {
  value = aws_cloudfront_distribution.this.id
}

output "distribution_domain_name" {
  value = aws_cloudfront_distribution.this.domain_name
}

output "acm_certificate_arn" {
  value = aws_acm_certificate.this.arn
}

output "acm_dns_validation_records" {
  value = aws_acm_certificate.this.domain_validation_options
}
```

- [ ] **Step 9: Commit**

```bash
git add infra/
git commit -m "scaffold terraform modules for bucket + cdn"
```

---

### Task 9: Create .env.example and docs

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create .env.example**

```env
# Database
DATABASE_URL=postgresql://localhost:5432/buckt

# Better Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# AWS
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1

# Trigger.dev
TRIGGER_SECRET_KEY=

# API
API_URL=http://localhost:3001
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "add env example"
```

---

### Task 10: Connect to GitHub repo and push

- [ ] **Step 1: Add remote and push**

```bash
cd /Users/jopcmelo/Developer/personal/branded-s3-provisioner
git remote add origin git@github.com:joaopcm/buckt.git
git push -u origin main
```

---

### Task 11: Create GitHub milestone issues

Create all milestone issues using `gh issue create`. Each issue should be labeled and detailed.

- [ ] **Step 1: Create labels**

```bash
gh label create "milestone" --color "0E8A16" --description "Major project milestone"
gh label create "backend" --color "1D76DB"
gh label create "frontend" --color "A2EEEF"
gh label create "infra" --color "D93F0B"
gh label create "sdk" --color "FBCA04"
gh label create "auth" --color "B60205"
gh label create "billing" --color "5319E7"
```

- [ ] **Step 2: Create Issue #1 — Database schema + Drizzle setup**

```bash
gh issue create --title "Database schema and Drizzle setup" --label "milestone,backend" --body "$(cat <<'EOF'
## Goal

Define and migrate the full database schema using Drizzle ORM + PostgreSQL.

## Scope

### Tables to create

**apiKeys**
- `id` (uuid, PK)
- `orgId` (text, FK to Better Auth org)
- `name` (text)
- `hashedKey` (text, unique)
- `prefix` (text) — first 8 chars of key for identification (e.g., `bkt_abc1`)
- `permissions` (jsonb) — array of permission strings
- `system` (boolean, default false)
- `lastUsedAt` (timestamp, nullable)
- `expiresAt` (timestamp, nullable)
- `createdAt` (timestamp)

**buckets**
- `id` (uuid, PK)
- `orgId` (text, FK to Better Auth org)
- `name` (text)
- `slug` (text, unique)
- `s3BucketName` (text, unique)
- `region` (text, default 'us-east-1')
- `customDomain` (text, unique)
- `cloudfrontDistributionId` (text, nullable)
- `acmCertArn` (text, nullable)
- `status` (enum: pending, provisioning, active, failed, deleting)
- `dnsRecords` (jsonb, nullable)
- `provisioningJobId` (text, nullable)
- `storageUsedBytes` (bigint, default 0)
- `bandwidthUsedBytes` (bigint, default 0)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### Indexes
- `apiKeys`: `orgId`, `hashedKey` (unique)
- `buckets`: `orgId`, `slug` (unique), `customDomain` (unique), `s3BucketName` (unique)

### Tasks
- [ ] Define Drizzle schema in `packages/db/src/schema/`
- [ ] Create initial migration
- [ ] Add seed script for development
- [ ] Add DB client export from `packages/db/src/index.ts`

### Notes
- Better Auth manages its own tables (users, sessions, organizations, members, subscriptions) — don't duplicate
- Use `text` for org/user IDs to match Better Auth's ID format
EOF
)"
```

- [ ] **Step 3: Create Issue #2 — Better Auth setup**

```bash
gh issue create --title "Better Auth setup with org + Stripe plugins" --label "milestone,auth" --body "$(cat <<'EOF'
## Goal

Configure Better Auth in `packages/auth` and integrate it into `apps/web` for user authentication, organization management, and Stripe billing.

## Scope

### Better Auth config (`packages/auth`)
- [ ] Install and configure Better Auth with Drizzle adapter
- [ ] Enable organization plugin (roles: owner, admin, member)
- [ ] Enable Stripe plugin for subscription management
- [ ] Export auth instance and type helpers

### Dashboard integration (`apps/web`)
- [ ] Mount Better Auth handler at `/api/auth/[...all]`
- [ ] Create auth client for client-side usage
- [ ] Add login/signup pages
- [ ] Add session middleware for protected routes
- [ ] On org creation: auto-generate system API key (system: true, full permissions, stored in apiKeys table)

### Stripe setup
- [ ] Configure Stripe plugin with product/price IDs for Free, Pro, Enterprise tiers
- [ ] Add Stripe webhook handler
- [ ] Create billing portal redirect

### Notes
- The API (`apps/api`) does NOT use Better Auth — it only validates API keys
- System API key generation happens in the web app's org creation flow via a Drizzle insert
- Better Auth manages its own tables — run its migration separately
EOF
)"
```

- [ ] **Step 4: Create Issue #3 — Hono REST API core**

```bash
gh issue create --title "Hono REST API with API key auth + bucket endpoints" --label "milestone,backend" --body "$(cat <<'EOF'
## Goal

Build the core REST API in `apps/api` with API key authentication and bucket CRUD endpoints.

## Scope

### API key auth middleware
- [ ] Parse `Authorization: Bearer bkt_...` header
- [ ] Hash the key, look up in `apiKeys` table
- [ ] Resolve org from the key
- [ ] Check permissions against the endpoint's required permission
- [ ] Update `lastUsedAt` on successful auth
- [ ] Return 401 for invalid/expired keys, 403 for insufficient permissions

### Bucket endpoints
- [ ] `POST /api/buckets` — create bucket (requires `buckets:write`)
  - Validate name + customDomain
  - Check org's plan limits (bucket count)
  - Create bucket record with status `pending`
  - Trigger provisioning job via Trigger.dev
- [ ] `GET /api/buckets` — list org's buckets (requires `buckets:read`)
  - Paginated, filterable by status
- [ ] `GET /api/buckets/:id` — bucket detail (requires `buckets:read`)
  - Include dnsRecords when status is `provisioning`
- [ ] `DELETE /api/buckets/:id` — trigger deletion (requires `buckets:delete`)
  - Set status to `deleting`, trigger destroy job

### API key management endpoints
- [ ] `POST /api/keys` — create API key (requires being a system key or having all permissions)
  - Generate key with `bkt_` prefix
  - Return unhashed key once, store hashed
- [ ] `GET /api/keys` — list keys (excludes system keys)
- [ ] `DELETE /api/keys/:id` — revoke key

### Notes
- All responses follow consistent JSON shape: `{ data, error, meta }`
- Use Zod for request validation (schemas from `@buckt/shared`)
- Org is resolved from API key — no org ID needed in URLs
EOF
)"
```

- [ ] **Step 5: Create Issue #4 — File management endpoints**

```bash
gh issue create --title "File upload/download/list endpoints (S3 proxy)" --label "milestone,backend" --body "$(cat <<'EOF'
## Goal

Add file management endpoints to the API that proxy to S3 buckets.

## Scope

### Endpoints
- [ ] `PUT /api/buckets/:id/files/*` — upload file (requires `files:write`)
  - Stream request body to S3
  - Set content-type from request headers
  - Update `storageUsedBytes` on bucket record
- [ ] `GET /api/buckets/:id/files` — list files (requires `files:read`)
  - Paginated S3 ListObjectsV2
  - Return key, size, lastModified, contentType
- [ ] `GET /api/buckets/:id/files/*` — get file metadata (requires `files:read`)
  - HeadObject from S3
  - Return size, contentType, lastModified, url (CloudFront URL)
- [ ] `DELETE /api/buckets/:id/files/*` — delete file (requires `files:delete`)
  - DeleteObject from S3
  - Update `storageUsedBytes`

### Prerequisites
- Bucket must be in `active` status for file operations
- AWS SDK v3 for S3 operations

### Notes
- Files are served directly via CloudFront (custom domain), not through the API
- The API is for management (upload, list, delete), not serving
- Max upload size should be configurable per plan tier
EOF
)"
```

- [ ] **Step 6: Create Issue #5 — Terraform provisioning via Trigger.dev**

```bash
gh issue create --title "Terraform provisioning pipeline via Trigger.dev" --label "milestone,infra,backend" --body "$(cat <<'EOF'
## Goal

Implement the automated bucket provisioning pipeline using Trigger.dev to orchestrate Terraform runs.

## Scope

### Trigger.dev setup
- [ ] Install and configure Trigger.dev in `apps/api`
- [ ] Create `provision-bucket` task
- [ ] Create `destroy-bucket` task
- [ ] Create `check-cert-validation` scheduled task

### provision-bucket task
Steps (each is a Trigger.dev step for durability):
1. Update bucket status to `provisioning`
2. Run `terraform init` with S3 backend (key: `buckets/{bucketId}/terraform.tfstate`)
3. Run `terraform apply` for the bucket module (S3 bucket + policy)
4. Run `terraform apply` for the CDN module (ACM cert request)
5. Extract DNS validation records from Terraform output → update bucket record
6. Poll for ACM cert validation (up to 72h, with exponential backoff)
7. Once validated, CloudFront distribution is created (part of the CDN module apply)
8. Update bucket record: status `active`, set `cloudfrontDistributionId`, `acmCertArn`

### destroy-bucket task
1. Update bucket status to `deleting`
2. Empty the S3 bucket (delete all objects)
3. Run `terraform destroy` for the bucket's state
4. Delete the bucket record from DB

### check-cert-validation (scheduled)
- Runs every 5 minutes
- Finds buckets in `provisioning` status
- Checks ACM cert validation status
- Updates bucket status if validated or failed (timeout after 72h)

### Terraform state management
- S3 backend bucket for all state files
- Each bucket gets isolated state: `buckets/{bucketId}/terraform.tfstate`
- DynamoDB table for state locking

### Error handling
- On Terraform failure: set bucket status to `failed`, store error message
- Trigger.dev retries with backoff for transient failures
- Manual retry endpoint: `POST /api/buckets/:id/retry`

### Prerequisites
- Terraform CLI available in the Trigger.dev worker environment
- AWS credentials with permissions for S3, CloudFront, ACM, Route53
- Shared S3 bucket + DynamoDB table for Terraform state (provisioned manually or via bootstrap Terraform)
EOF
)"
```

- [ ] **Step 7: Create Issue #6 — Node.js SDK**

```bash
gh issue create --title "Node.js SDK (@buckt/sdk)" --label "milestone,sdk" --body "$(cat <<'EOF'
## Goal

Build the official Node.js SDK for the Buckt API. Used by external consumers and by the dashboard internally.

## Scope

### Client class
- [ ] `new Buckt({ apiKey, baseUrl? })` constructor
- [ ] HTTP client (fetch-based, no external deps)
- [ ] Error handling: typed errors (BucktError, NotFoundError, ForbiddenError, ValidationError)
- [ ] Request/response type safety

### Bucket methods
- [ ] `client.buckets.create({ name, customDomain })` → Bucket
- [ ] `client.buckets.list({ page?, status? })` → PaginatedResponse<Bucket>
- [ ] `client.buckets.get(id)` → Bucket
- [ ] `client.buckets.delete(id)` → void

### File methods
- [ ] `client.files.upload(bucketId, path, body, contentType?)` → FileInfo
- [ ] `client.files.list(bucketId, { prefix?, page? })` → PaginatedResponse<FileInfo>
- [ ] `client.files.get(bucketId, path)` → FileInfo
- [ ] `client.files.delete(bucketId, path)` → void

### Key methods
- [ ] `client.keys.create({ name, permissions })` → ApiKey (with raw key)
- [ ] `client.keys.list()` → ApiKey[]
- [ ] `client.keys.delete(id)` → void

### Package setup
- [ ] Publishable to npm as `@buckt/sdk`
- [ ] ESM + CJS dual exports
- [ ] TypeScript declarations
- [ ] Zero runtime dependencies
- [ ] README with usage examples

### Testing
- [ ] Unit tests with mocked HTTP
- [ ] Integration test suite (optional, against local API)
EOF
)"
```

- [ ] **Step 8: Create Issue #7 — Dashboard: auth + org pages**

```bash
gh issue create --title "Dashboard: authentication and org management" --label "milestone,frontend,auth" --body "$(cat <<'EOF'
## Goal

Build the authentication flow and organization management pages in the Next.js dashboard.

## Scope

### Auth pages
- [ ] `/login` — email/password login via Better Auth
- [ ] `/signup` — registration with org creation
- [ ] Post-signup redirect to org dashboard
- [ ] Session-protected layout for `/org/*` routes

### Org management
- [ ] `/org/[orgId]/settings` — org settings page
  - Org name, update
  - Member list with roles
  - Invite member flow
  - Remove member
- [ ] Org switcher in sidebar (if user belongs to multiple orgs)

### tRPC setup
- [ ] Create tRPC router in `apps/web`
- [ ] tRPC procedures use `@buckt/sdk` with system API key
- [ ] Server-side caller for server components
- [ ] React Query client for client components
- [ ] Auth context provider wrapping tRPC provider

### Layout
- [ ] Sidebar navigation (Dashboard, Buckets, Settings, Billing)
- [ ] Top bar with user menu (profile, logout)
- [ ] Shadcn-based component library

### Notes
- All tRPC procedures first resolve the user's session, then the org's system API key
- Use Shadcn components: Button, Input, Card, Table, Dialog, DropdownMenu
EOF
)"
```

- [ ] **Step 9: Create Issue #8 — Dashboard: bucket management**

```bash
gh issue create --title "Dashboard: bucket management UI" --label "milestone,frontend" --body "$(cat <<'EOF'
## Goal

Build the bucket creation, listing, and detail pages in the dashboard.

## Scope

### Bucket list page (`/org/[orgId]/buckets`)
- [ ] Table view with columns: name, domain, status, created
- [ ] Status badges (pending=yellow, provisioning=blue, active=green, failed=red, deleting=gray)
- [ ] "New bucket" button
- [ ] Empty state for orgs with no buckets

### Bucket creation (`/org/[orgId]/buckets/new`)
- [ ] Form: name (text), custom domain (text)
- [ ] Domain format validation
- [ ] Plan limit check (show upgrade prompt if at limit)
- [ ] Submit → redirect to bucket detail page

### Bucket detail (`/org/[orgId]/buckets/[id]`)
- [ ] Status banner with current state
- [ ] DNS configuration section (when provisioning):
  - Show CNAME records user needs to add
  - "Check DNS" button that polls bucket status
  - Instructions for common DNS providers
- [ ] File browser (when active):
  - List files in table (name, size, modified)
  - Upload button with drag-and-drop zone
  - Delete file with confirmation
  - Copy public URL (CloudFront domain)
- [ ] Usage stats: storage used, bandwidth used
- [ ] Delete bucket with confirmation dialog

### Notes
- Use polling (every 10s) for status updates during provisioning
- File uploads should show progress indicator
- Shadcn components: Table, Badge, Card, Dialog, Tabs, Progress
EOF
)"
```

- [ ] **Step 10: Create Issue #9 — Dashboard: API key management**

```bash
gh issue create --title "Dashboard: API key management" --label "milestone,frontend" --body "$(cat <<'EOF'
## Goal

Build the API key management UI in the org settings page.

## Scope

### API keys section in `/org/[orgId]/settings`
- [ ] List existing API keys (name, prefix, permissions, created, last used)
  - System keys are hidden from this list
- [ ] "Create API key" dialog:
  - Name input
  - Permission checkboxes (buckets:read, buckets:write, buckets:delete, files:read, files:write, files:delete)
  - On create: show the full key ONCE with copy-to-clipboard
  - Warning: "This key won't be shown again"
- [ ] Revoke key with confirmation dialog
- [ ] Empty state when no user-created keys exist

### Notes
- The raw API key is only available at creation time (API returns it once)
- Show key prefix (bkt_abc1...) for identification after creation
- Shadcn components: Table, Dialog, Checkbox, Input, Button, Alert
EOF
)"
```

- [ ] **Step 11: Create Issue #10 — Billing + Stripe integration**

```bash
gh issue create --title "Billing: Stripe subscriptions + usage metering" --label "milestone,billing" --body "$(cat <<'EOF'
## Goal

Implement subscription management and usage-based billing via Better Auth's Stripe plugin.

## Scope

### Subscription management
- [ ] Free tier auto-assigned on org creation
- [ ] Upgrade/downgrade flow via Stripe Checkout
- [ ] Stripe Customer Portal for invoice/payment management
- [ ] Webhook handler for subscription lifecycle events (created, updated, canceled, past_due)

### Plan enforcement
- [ ] Bucket creation checks plan limits (bucket count)
- [ ] File upload checks storage limits
- [ ] Return 402 with upgrade prompt when limits exceeded

### Usage metering
- [ ] Trigger.dev scheduled job: aggregate storage per org (daily)
  - Sum S3 bucket sizes via CloudWatch GetMetricData or S3 API
  - Update `storageUsedBytes` on each bucket record
  - Report overage to Stripe as usage record
- [ ] Trigger.dev scheduled job: aggregate bandwidth per org (daily)
  - Parse CloudFront access logs from S3
  - Update `bandwidthUsedBytes` on each bucket record
  - Report overage to Stripe as usage record

### Billing page (`/org/[orgId]/billing`)
- [ ] Current plan display with limits
- [ ] Usage bars (storage, bandwidth) showing current vs limit
- [ ] Upgrade/downgrade buttons
- [ ] Link to Stripe Customer Portal for invoices
- [ ] Plan comparison table

### Pricing tiers
| Tier | Buckets | Storage | Bandwidth/mo |
|------|---------|---------|-------------|
| Free | 1 | 1 GB | 10 GB |
| Pro | 10 | 100 GB | 1 TB |
| Enterprise | Unlimited | Custom | Custom |

### Notes
- Stripe product/price IDs should be configurable via env vars
- Overage pricing TBD — create Stripe metered prices for storage_gb and bandwidth_gb
- Enterprise tier: contact sales flow (not self-serve)
EOF
)"
```

- [ ] **Step 12: Create Issue #11 — Billing usage endpoint**

```bash
gh issue create --title "API: billing usage endpoint" --label "milestone,backend,billing" --body "$(cat <<'EOF'
## Goal

Add billing/usage endpoints to the REST API.

## Scope

- [ ] `GET /api/billing/usage` — returns current org's storage + bandwidth usage
  - Aggregates from all bucket records
  - Returns current vs plan limit
- [ ] `GET /api/billing/subscription` — returns current plan info
  - Plan name, status, limits
  - Current period start/end

### Notes
- These endpoints are consumed by the dashboard's billing page via the SDK
- Requires `buckets:read` permission (or system key)
EOF
)"
```

- [ ] **Step 13: Commit docs**

```bash
git add docs/
git commit -m "add design spec and implementation plan"
git push
```
