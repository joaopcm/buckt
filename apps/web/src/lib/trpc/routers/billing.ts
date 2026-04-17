import { buckets, subscription } from "@buckt/db";
import { PLAN_LIMITS, type PlanName } from "@buckt/shared";
import { and, count, eq, ne, sum } from "drizzle-orm";
import { orgProcedure, router } from "../init";

export const billingRouter = router({
  subscription: orgProcedure.query(async ({ ctx }) => {
    const [sub] = await ctx.db
      .select()
      .from(subscription)
      .where(
        and(
          eq(subscription.referenceId, ctx.orgId),
          eq(subscription.status, "active")
        )
      )
      .limit(1);

    return {
      plan: (sub?.plan ?? "free") as PlanName,
      status: sub?.status ?? "free",
      periodStart: sub?.periodStart ?? null,
      periodEnd: sub?.periodEnd ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      cancelAt: sub?.cancelAt ?? null,
    };
  }),

  usage: orgProcedure.query(async ({ ctx }) => {
    const [sub] = await ctx.db
      .select({ plan: subscription.plan })
      .from(subscription)
      .where(
        and(
          eq(subscription.referenceId, ctx.orgId),
          eq(subscription.status, "active")
        )
      )
      .limit(1);

    const plan = (sub?.plan ?? "free") as PlanName;
    const limits = PLAN_LIMITS[plan];

    const [result] = await ctx.db
      .select({
        bucketCount: count(),
        totalStorage: sum(buckets.storageUsedBytes),
        totalBandwidth: sum(buckets.bandwidthUsedBytes),
      })
      .from(buckets)
      .where(and(eq(buckets.orgId, ctx.orgId), ne(buckets.status, "deleting")));

    return {
      buckets: {
        used: result.bucketCount,
        limit: limits.maxBuckets,
      },
      storage: {
        usedBytes: Number(result.totalStorage ?? 0),
        limitBytes: limits.maxStorageBytes,
      },
      bandwidth: {
        usedBytes: Number(result.totalBandwidth ?? 0),
        limitBytes: limits.maxBandwidthBytesPerMonth,
      },
    };
  }),
});
