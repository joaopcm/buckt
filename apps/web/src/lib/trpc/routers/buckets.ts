import { buckets } from "@buckt/db";
import { createBucketSchema } from "@buckt/shared";
import { tasks } from "@trigger.dev/sdk/v3";
import { TRPCError } from "@trpc/server";
import { and, asc, count, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../init";

export const bucketsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().int().positive().max(100).default(20),
        status: z
          .enum(["pending", "provisioning", "active", "failed", "deleting"])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { orgId, cursor, limit, status } = input;
      const conditions = [eq(buckets.orgId, orgId)];
      if (status) {
        conditions.push(eq(buckets.status, status));
      }
      if (cursor) {
        conditions.push(gt(buckets.id, cursor));
      }

      const items = await ctx.db
        .select()
        .from(buckets)
        .where(and(...conditions))
        .orderBy(asc(buckets.id))
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

  get: protectedProcedure
    .input(z.object({ orgId: z.string(), id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [bucket] = await ctx.db
        .select()
        .from(buckets)
        .where(and(eq(buckets.id, input.id), eq(buckets.orgId, input.orgId)))
        .limit(1);

      return bucket ?? null;
    }),

  count: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .select({ count: count() })
        .from(buckets)
        .where(eq(buckets.orgId, input.orgId));

      return result.count;
    }),

  create: protectedProcedure
    .input(createBucketSchema.extend({ orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
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
        `buckt-${input.orgId.slice(0, 8)}-${slug}`.toLowerCase();

      const [bucket] = await ctx.db
        .insert(buckets)
        .values({
          orgId: input.orgId,
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
});
