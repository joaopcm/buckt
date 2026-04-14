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
  | "files:delete"
  | "aws-accounts:read"
  | "aws-accounts:write"
  | "aws-accounts:delete";

export type BucketVisibility = "public" | "private";

export type CachePreset =
  | "no-cache"
  | "short"
  | "standard"
  | "aggressive"
  | "immutable";

export type OptimizationMode = "none" | "light" | "balanced" | "maximum";

export interface ManagedSettings {
  cache?: boolean;
  cors?: boolean;
  lifecycle?: boolean;
  optimization?: boolean;
  visibility?: boolean;
}

export interface Bucket {
  acmCertArn: string | null;
  awsAccountId: string | null;
  bandwidthUsedBytes: number;
  cacheControlOverride: string | null;
  cachePreset: CachePreset;
  cloudfrontDistributionId: string | null;
  corsOrigins: string[];
  createdAt: string;
  customDomain: string;
  dnsRecords: unknown | null;
  domainConnectProvider: string | null;
  id: string;
  isImported: boolean;
  lifecycleTtlDays: number | null;
  managedSettings: ManagedSettings | null;
  name: string;
  optimizationMode: OptimizationMode;
  orgId: string;
  provisioningJobId: string | null;
  region: string;
  s3BucketName: string;
  slug: string;
  status: BucketStatus;
  storageUsedBytes: number;
  updatedAt: string;
  visibility: BucketVisibility;
}

export type AwsAccountStatus = "pending" | "validating" | "active" | "failed";

export interface AwsAccount {
  awsAccountId: string;
  createdAt: string;
  externalId: string;
  id: string;
  label: string | null;
  lastValidatedAt: string | null;
  orgId: string;
  roleArn: string;
  stackId: string | null;
  status: AwsAccountStatus;
  updatedAt: string;
}

export interface S3BucketInfo {
  creationDate: string;
  name: string;
}

export interface ApiKey {
  bucketIds: string[] | null;
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
