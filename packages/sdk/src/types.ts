export type BucketStatus = "pending" | "provisioning" | "active" | "failed" | "deleting"

export type Permission =
  | "buckets:read"
  | "buckets:write"
  | "buckets:delete"
  | "files:read"
  | "files:write"
  | "files:delete"

export interface Bucket {
  id: string
  orgId: string
  name: string
  slug: string
  s3BucketName: string
  region: string
  customDomain: string
  cloudfrontDistributionId: string | null
  acmCertArn: string | null
  status: BucketStatus
  dnsRecords: unknown | null
  provisioningJobId: string | null
  storageUsedBytes: number
  bandwidthUsedBytes: number
  createdAt: string
  updatedAt: string
}

export interface ApiKey {
  id: string
  name: string
  prefix: string
  permissions: Permission[]
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

export interface ApiKeyWithSecret extends ApiKey {
  key: string
  orgId: string
  hashedKey: string
  system: boolean
}

export interface FileInfo {
  key: string
  size: number
  lastModified: string
  contentType: string
  url?: string
}

export interface CursorMeta {
  nextCursor: string | null
  limit: number
}

export interface ApiResponse<T> {
  data: T
  error: null
  meta: CursorMeta | null
}

export interface ApiErrorResponse {
  data: null
  error: { message: string }
  meta: null
}

export interface BucktOptions {
  apiKey: string
  baseUrl?: string
}
