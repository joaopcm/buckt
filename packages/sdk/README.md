# @buckt/sdk

Official TypeScript SDK for the Buckt API. Zero runtime dependencies, uses native `fetch`.

## Installation

```bash
npm install @buckt/sdk
```

## Quick Start

```ts
import { Buckt } from '@buckt/sdk'

const client = new Buckt({ apiKey: 'bkt_...' })

const bucket = await client.buckets.create({
  name: 'Assets',
  customDomain: 'assets.acme.com',
})
```

## Configuration

```ts
const client = new Buckt({
  apiKey: 'bkt_...', // required
  baseUrl: 'https://api.buckt.dev', // optional, this is the default
})
```

## Resources

### Buckets (`client.buckets`)

```ts
// Create
const bucket = await client.buckets.create({
  name: 'Assets',
  customDomain: 'assets.acme.com',
  region: 'us-east-1',          // optional
  visibility: 'public',         // optional: 'public' | 'private'
  cachePreset: 'aggressive',    // optional: 'no-cache' | 'short' | 'standard' | 'aggressive' | 'immutable'
  corsOrigins: ['https://acme.com'], // optional
  lifecycleTtlDays: 90,         // optional
  optimizationMode: 'balanced', // optional: 'none' | 'light' | 'balanced' | 'maximum'
})

// List (cursor-based pagination)
const { data: buckets, meta } = await client.buckets.list({
  cursor: undefined, // optional
  limit: 20,         // optional
  status: 'active',  // optional filter
})

// Get
const bucket = await client.buckets.get('bucket-id')

// Update
const updated = await client.buckets.update('bucket-id', {
  name: 'New Name',
  cachePreset: 'immutable',
})

// Delete
await client.buckets.delete('bucket-id')
```

### Files (`client.files`)

```ts
// Upload
await client.files.upload('bucket-id', 'images/logo.png', buffer, 'image/png', {
  optimization: 'balanced', // optional: triggers server-side image optimization
})

// List
const { data: files, meta } = await client.files.list('bucket-id', {
  prefix: 'images/',  // optional
  cursor: undefined,   // optional
  limit: 50,           // optional
})

// Get metadata
const file = await client.files.get('bucket-id', 'images/logo.png')

// Delete
await client.files.delete('bucket-id', 'images/logo.png')
```

### Keys (`client.keys`)

```ts
// Create
const key = await client.keys.create({
  name: 'Read-only key',
  permissions: ['buckets:read', 'files:read'],
  expiresAt: '2025-12-31T00:00:00Z', // optional
})
// key.secret contains the raw key (only shown once)

// List
const { data: keys, meta } = await client.keys.list()

// Delete
await client.keys.delete('key-id')
```

## Permissions

`buckets:read` `buckets:write` `buckets:delete` `files:read` `files:write` `files:delete` `keys:read` `keys:write`

## Error Handling

All errors extend `BucktError` with `.status` and `.message` properties:

| Class | Status |
|---|---|
| `ValidationError` | 400 |
| `UnauthorizedError` | 401 |
| `PaymentRequiredError` | 402 |
| `ForbiddenError` | 403 |
| `NotFoundError` | 404 |
| `TimeoutError` | 408 |
| `ConflictError` | 409 |
| `RateLimitError` | 429 |

```ts
import { Buckt, NotFoundError, RateLimitError } from '@buckt/sdk'

try {
  await client.buckets.get('nonexistent')
} catch (err) {
  if (err instanceof NotFoundError) {
    // handle 404
  }
  if (err instanceof RateLimitError) {
    // back off and retry
  }
}
```

## Pagination

All list methods return cursor-based pagination:

```ts
let cursor: string | undefined

do {
  const { data, meta } = await client.buckets.list({ cursor })
  // process data
  cursor = meta.nextCursor
} while (cursor)
```

## Build

Built with tsup. Outputs ESM (`dist/index.js`), CJS (`dist/index.cjs`), and type declarations.
