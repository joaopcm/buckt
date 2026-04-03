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
