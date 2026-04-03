export type BucketStatus =
  | "pending"
  | "provisioning"
  | "active"
  | "failed"
  | "deleting";

export type Permission =
  | "buckets:read"
  | "buckets:write"
  | "buckets:delete"
  | "files:read"
  | "files:write"
  | "files:delete";

export interface Bucket {
  acmCertArn: string | null;
  bandwidthUsedBytes: number;
  cloudfrontDistributionId: string | null;
  createdAt: string;
  customDomain: string;
  dnsRecords: unknown | null;
  id: string;
  name: string;
  orgId: string;
  provisioningJobId: string | null;
  region: string;
  s3BucketName: string;
  slug: string;
  status: BucketStatus;
  storageUsedBytes: number;
  updatedAt: string;
}

export interface ApiKey {
  createdAt: string;
  expiresAt: string | null;
  id: string;
  lastUsedAt: string | null;
  name: string;
  permissions: Permission[];
  prefix: string;
}

export interface ApiKeyWithSecret extends ApiKey {
  hashedKey: string;
  key: string;
  orgId: string;
}

export interface FileInfo {
  contentType: string;
  key: string;
  lastModified: string;
  size: number;
  url?: string;
}

export interface CursorMeta {
  limit: number;
  nextCursor: string | null;
}

export interface ApiResponse<T> {
  data: T;
  error: null;
  meta: CursorMeta | null;
}

export interface ApiErrorResponse {
  data: null;
  error: { message: string };
  meta: null;
}

export interface BucktOptions {
  apiKey: string;
  baseUrl?: string;
}
