# @buckt/shared

Shared types, Zod validation schemas, and plan constants used across the monorepo.

## Plan Limits

| | Free | Pro | Enterprise |
|---|---|---|---|
| Buckets | 1 | 10 | Unlimited |
| Storage | 1 GB | 100 GB | Unlimited |
| Bandwidth/mo | 10 GB | 1 TB | Unlimited |
| Requests/min | 100 | 1,000 | 10,000 |

Exported as `PLAN_LIMITS` constant.

## Constants

| Export | Description |
|---|---|
| `ALLOWED_REGIONS` | `us-east-1`, `us-west-2`, `eu-west-1`, `eu-central-1`, `ap-southeast-1`, `ap-northeast-1` |
| `CACHE_PRESET_MAP` | Maps preset names to `Cache-Control` header values |
| `OPTIMIZATION_MODES` | `none`, `light`, `balanced`, `maximum` |
| `OPTIMIZABLE_CONTENT_TYPES` | JPEG, PNG, WebP, AVIF, GIF |
| `MIN_OPTIMIZATION_BYTES` | 10 KB minimum for optimization |

## Zod Schemas

### Buckets

- `createBucketSchema` — name, customDomain, region, visibility, cachePreset, corsOrigins, lifecycleTtlDays, optimizationMode
- `updateBucketSchema` — partial update fields
- `listBucketsSchema` — cursor, limit, status filter

### Keys

- `createKeySchema` — name, permissions array, expiresAt
- `PERMISSIONS` — 8 permission strings (`buckets:read`, `buckets:write`, `buckets:delete`, `files:read`, `files:write`, `files:delete`, `keys:read`, `keys:write`)

### Files

- `listFilesSchema` — prefix, cursor, limit

### Organizations

- `createOrgSchema` — name (2-100 chars)
- `renameOrgSchema` — new name
- `inviteMemberSchema` — email, role
- `updateRoleSchema` — memberId, role

## Types

`PlanName`, `AllowedRegion`, `CachePreset`, `BucketVisibility`, `OptimizationMode`, `Permission`, `OrgRole`
