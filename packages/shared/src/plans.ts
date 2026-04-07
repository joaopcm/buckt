export const PLAN_LIMITS = {
  free: {
    maxBuckets: 1,
    maxStorageBytes: 1 * 1024 * 1024 * 1024,
    maxBandwidthBytesPerMonth: 10 * 1024 * 1024 * 1024,
    maxRequestsPerMinute: 100,
  },
  pro: {
    maxBuckets: 10,
    maxStorageBytes: 100 * 1024 * 1024 * 1024,
    maxBandwidthBytesPerMonth: 1024 * 1024 * 1024 * 1024,
    maxRequestsPerMinute: 1000,
  },
  enterprise: {
    maxBuckets: Number.POSITIVE_INFINITY,
    maxStorageBytes: Number.POSITIVE_INFINITY,
    maxBandwidthBytesPerMonth: Number.POSITIVE_INFINITY,
    maxRequestsPerMinute: 10_000,
  },
} as const;

export type PlanName = keyof typeof PLAN_LIMITS;

export const ALLOWED_REGIONS = [
  "us-east-1",
  "us-west-2",
  "eu-west-1",
  "eu-central-1",
  "ap-southeast-1",
  "ap-northeast-1",
] as const;

export type AllowedRegion = (typeof ALLOWED_REGIONS)[number];

export const CACHE_PRESET_MAP = {
  "no-cache": "no-store, no-cache, must-revalidate",
  short: "public, max-age=3600",
  standard: "public, max-age=86400",
  aggressive: "public, max-age=2592000, immutable",
  immutable: "public, max-age=31536000, immutable",
} as const;

export type CachePreset = keyof typeof CACHE_PRESET_MAP;

export type BucketVisibility = "public" | "private";
