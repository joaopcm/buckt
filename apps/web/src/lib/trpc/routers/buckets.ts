import { buckets, subscription } from "@buckt/db";
import { createBucketSchema, PLAN_LIMITS, type PlanName } from "@buckt/shared";
import { tasks } from "@trigger.dev/sdk/v3";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, lt, sum } from "drizzle-orm";
import { z } from "zod";
import { orgProcedure, router } from "../init";

export const bucketsRouter = router({
  list: orgProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().int().positive().max(100).default(20),
        status: z
          .enum(["pending", "provisioning", "active", "failed", "deleting"])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit, status } = input;
      const conditions = [eq(buckets.orgId, ctx.orgId)];
      if (status) {
        conditions.push(eq(buckets.status, status));
      }
      if (cursor) {
        conditions.push(lt(buckets.id, cursor));
      }

      const items = await ctx.db
        .select()
        .from(buckets)
        .where(and(...conditions))
        .orderBy(desc(buckets.createdAt))
        .limit(limit + 1);

      const hasMore = items.length > limit;
      if (hasMore) {
        items.pop();
      }

      return {
        items,
        nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
      };
    }),

  get: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [bucket] = await ctx.db
        .select()
        .from(buckets)
        .where(and(eq(buckets.id, input.id), eq(buckets.orgId, ctx.orgId)))
        .limit(1);

      if (!bucket) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bucket not found" });
      }

      return bucket;
    }),

  count: orgProcedure.query(async ({ ctx }) => {
    const [result] = await ctx.db
      .select({ count: count() })
      .from(buckets)
      .where(eq(buckets.orgId, ctx.orgId));

    return result.count;
  }),

  stats: orgProcedure.query(async ({ ctx }) => {
    const [result] = await ctx.db
      .select({
        count: count(),
        totalStorage: sum(buckets.storageUsedBytes),
        totalBandwidth: sum(buckets.bandwidthUsedBytes),
      })
      .from(buckets)
      .where(eq(buckets.orgId, ctx.orgId));

    return {
      bucketCount: result.count,
      totalStorageBytes: Number(result.totalStorage ?? 0),
      totalBandwidthBytes: Number(result.totalBandwidth ?? 0),
    };
  }),

  create: orgProcedure
    .input(createBucketSchema)
    .mutation(async ({ ctx, input }) => {
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

      const [{ bucketCount }] = await ctx.db
        .select({ bucketCount: count() })
        .from(buckets)
        .where(eq(buckets.orgId, ctx.orgId));

      if (bucketCount >= limits.maxBuckets) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Plan limit reached: maximum ${limits.maxBuckets} bucket(s)`,
        });
      }

      const [existing] = await ctx.db
        .select({ id: buckets.id })
        .from(buckets)
        .where(eq(buckets.customDomain, input.customDomain))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Domain already in use",
        });
      }

      const slug = input.customDomain.replace(/\./g, "-");
      const s3BucketName =
        `buckt-${ctx.orgId.slice(0, 8)}-${slug}`.toLowerCase();

      const [bucket] = await ctx.db
        .insert(buckets)
        .values({
          orgId: ctx.orgId,
          name: input.name,
          slug,
          s3BucketName,
          customDomain: input.customDomain,
          status: "pending",
        })
        .returning();

      const handle = await tasks.trigger("provision-bucket", {
        bucketId: bucket.id,
      });

      await ctx.db
        .update(buckets)
        .set({ provisioningJobId: handle.id })
        .where(eq(buckets.id, bucket.id));

      return bucket;
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [bucket] = await ctx.db
        .select()
        .from(buckets)
        .where(and(eq(buckets.id, input.id), eq(buckets.orgId, ctx.orgId)))
        .limit(1);

      if (!bucket) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bucket not found",
        });
      }

      if (bucket.status === "deleting") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Bucket is already being deleted",
        });
      }

      await ctx.db
        .update(buckets)
        .set({ status: "deleting" })
        .where(eq(buckets.id, input.id));

      await tasks.trigger("destroy-bucket", { bucketId: input.id });

      return { id: input.id, status: "deleting" as const };
    }),

  retry: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [bucket] = await ctx.db
        .select()
        .from(buckets)
        .where(and(eq(buckets.id, input.id), eq(buckets.orgId, ctx.orgId)))
        .limit(1);

      if (!bucket) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bucket not found",
        });
      }

      if (bucket.status !== "failed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only failed buckets can be retried",
        });
      }

      await ctx.db
        .update(buckets)
        .set({
          status: "pending",
          acmCertArn: null,
          dnsRecords: null,
          cloudfrontDistributionId: null,
        })
        .where(eq(buckets.id, input.id));

      const handle = await tasks.trigger("provision-bucket", {
        bucketId: input.id,
      });

      await ctx.db
        .update(buckets)
        .set({ provisioningJobId: handle.id })
        .where(eq(buckets.id, input.id));

      return { id: input.id, status: "pending" as const };
    }),
});
