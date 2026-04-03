import { buckets } from "@buckt/db";
import { eq, sql } from "drizzle-orm";
import type { Context } from "hono";
import { db } from "../../lib/db";
import { success } from "../../lib/response";

export async function getUsage(c: Context) {
  const orgId = c.get("orgId") as string;
  const planLimits = c.get("planLimits") as {
    maxBuckets: number;
    maxStorageBytes: number;
    maxBandwidthBytesPerMonth: number;
  };

  const [result] = await db
    .select({
      bucketCount: sql<number>`count(*)::int`,
      totalStorage: sql<number>`coalesce(sum(${buckets.storageUsedBytes}), 0)::bigint`,
      totalBandwidth: sql<number>`coalesce(sum(${buckets.bandwidthUsedBytes}), 0)::bigint`,
    })
    .from(buckets)
    .where(eq(buckets.orgId, orgId));

  return success(c, {
    bucketCount: {
      used: result.bucketCount,
      limit: planLimits.maxBuckets,
    },
    storage: {
      usedBytes: Number(result.totalStorage),
      limitBytes: planLimits.maxStorageBytes,
    },
    bandwidth: {
      usedBytes: Number(result.totalBandwidth),
      limitBytes: planLimits.maxBandwidthBytesPerMonth,
    },
  });
}
