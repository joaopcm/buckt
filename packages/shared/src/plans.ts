export const PLAN_LIMITS = {
  free: {
    maxBuckets: 1,
    maxStorageBytes: 1 * 1024 * 1024 * 1024,
    maxBandwidthBytesPerMonth: 10 * 1024 * 1024 * 1024,
  },
  pro: {
    maxBuckets: 10,
    maxStorageBytes: 100 * 1024 * 1024 * 1024,
    maxBandwidthBytesPerMonth: 1024 * 1024 * 1024 * 1024,
  },
  enterprise: {
    maxBuckets: Infinity,
    maxStorageBytes: Infinity,
    maxBandwidthBytesPerMonth: Infinity,
  },
} as const

export type PlanName = keyof typeof PLAN_LIMITS
