import { buckets, subscription } from "@buckt/db";
import { DnsInstructionsEmail } from "@buckt/emails";
import {
  createBucketSchema,
  forwardInstructionsSchema,
  PLAN_LIMITS,
  type PlanName,
} from "@buckt/shared";
import { tasks } from "@trigger.dev/sdk/v3";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, ilike, lt, sum } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { resend } from "@/lib/resend";
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
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit, status, search } = input;
      const baseConditions = [eq(buckets.orgId, ctx.orgId)];
      if (status) {
        baseConditions.push(eq(buckets.status, status));
      }
      if (search) {
        baseConditions.push(ilike(buckets.name, `%${search}%`));
      }

      const conditions = [...baseConditions];
      if (cursor) {
        conditions.push(lt(buckets.id, cursor));
      }

      const [items, [{ total }]] = await Promise.all([
        ctx.db
          .select()
          .from(buckets)
          .where(and(...conditions))
          .orderBy(desc(buckets.createdAt))
          .limit(limit + 1),
        ctx.db
          .select({ total: count() })
          .from(buckets)
          .where(and(...baseConditions)),
      ]);

      const hasMore = items.length > limit;
      if (hasMore) {
        items.pop();
      }

      return {
        items,
        nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
        total,
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

      if (
        input.optimizationMode &&
        input.optimizationMode !== "none" &&
        plan === "free"
      ) {
        throw new TRPCError({
          code: "PAYMENT_REQUIRED",
          message: "Optimization requires a paid plan. Upgrade to enable.",
        });
      }

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
          region: input.region,
          visibility: input.visibility,
          cachePreset: input.cachePreset,
          corsOrigins: input.corsOrigins,
          lifecycleTtlDays: input.lifecycleTtlDays,
          optimizationMode: input.optimizationMode,
          domainConnectProvider: input.domainConnectProvider,
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

  rename: orgProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const [bucket] = await ctx.db
        .select({ id: buckets.id })
        .from(buckets)
        .where(and(eq(buckets.id, input.id), eq(buckets.orgId, ctx.orgId)))
        .limit(1);

      if (!bucket) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bucket not found",
        });
      }

      await ctx.db
        .update(buckets)
        .set({ name: input.name })
        .where(eq(buckets.id, input.id));

      return { id: input.id, name: input.name };
    }),

  updateSettings: orgProcedure
    .input(
      z.object({
        id: z.string(),
        visibility: z.enum(["public", "private"]).optional(),
        cachePreset: z
          .enum(["no-cache", "short", "standard", "aggressive", "immutable"])
          .optional(),
        cacheControlOverride: z.string().max(256).nullable().optional(),
        corsOrigins: z
          .array(z.string().url("Invalid origin URL"))
          .max(10)
          .optional(),
        lifecycleTtlDays: z
          .number()
          .int()
          .min(1)
          .max(3650)
          .nullable()
          .optional(),
        optimizationMode: z
          .enum(["none", "light", "balanced", "maximum"])
          .optional(),
      })
    )
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

      if (input.optimizationMode && input.optimizationMode !== "none") {
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
        if (plan === "free") {
          throw new TRPCError({
            code: "PAYMENT_REQUIRED",
            message: "Optimization requires a paid plan. Upgrade to enable.",
          });
        }
      }

      const { id, ...updates } = input;

      const [updated] = await ctx.db
        .update(buckets)
        .set(updates)
        .where(eq(buckets.id, id))
        .returning();

      return updated;
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

  verifyCname: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [bucket] = await ctx.db
        .select()
        .from(buckets)
        .where(and(eq(buckets.id, input.id), eq(buckets.orgId, ctx.orgId)))
        .limit(1);

      if (!bucket || bucket.status !== "active") {
        return { verified: false };
      }

      const records = (
        Array.isArray(bucket.dnsRecords) ? bucket.dnsRecords : []
      ) as Array<{
        name: string;
        type: string;
        value: string;
        applied?: boolean;
      }>;

      const cnameRecord = records.find(
        (r) =>
          r.type === "CNAME" && r.name === bucket.customDomain && !r.applied
      );

      if (!cnameRecord) {
        return { verified: true };
      }

      try {
        const { resolveCname } = await import("node:dns/promises");
        const results = await resolveCname(bucket.customDomain);
        const matches = results.some(
          (r) => r === cnameRecord.value || r === `${cnameRecord.value}.`
        );

        if (matches) {
          const updated = records.map((r) =>
            r === cnameRecord ? { ...r, applied: true } : r
          );
          await ctx.db
            .update(buckets)
            .set({ dnsRecords: updated })
            .where(eq(buckets.id, bucket.id));
          return { verified: true };
        }
      } catch {
        return { verified: false };
      }

      return { verified: false };
    }),

  forwardInstructions: orgProcedure
    .input(forwardInstructionsSchema)
    .mutation(async ({ ctx, input }) => {
      const [bucket] = await ctx.db
        .select()
        .from(buckets)
        .where(
          and(eq(buckets.id, input.bucketId), eq(buckets.orgId, ctx.orgId))
        )
        .limit(1);

      if (!bucket) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Bucket not found",
        });
      }

      const allRecords = (
        Array.isArray(bucket.dnsRecords) ? bucket.dnsRecords : []
      ) as { applied?: boolean; name: string; type: string; value: string }[];

      const PLACEHOLDER = "pending-cloudfront-distribution";
      const domain = bucket.customDomain;
      const rootDomain = domain.split(".").slice(-2).join(".");

      const records =
        input.serviceId === "acm-validation"
          ? [
              ...allRecords.filter((r) => r.value !== PLACEHOLDER),
              { name: rootDomain, type: "CAA", value: '0 issue "amazon.com"' },
            ]
          : allRecords.filter(
              (r) => r.name === domain && r.value !== PLACEHOLDER
            );

      if (records.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No DNS records available for this step",
        });
      }

      const org = await auth.api.getFullOrganization({
        headers: ctx.headers,
        query: { organizationId: ctx.orgId },
      });

      const senderName = ctx.session?.user?.name ?? "A team member";
      const orgName = org?.name ?? "your organization";

      const results = await Promise.allSettled(
        input.emails.map((email) =>
          resend.emails.send({
            from: "Buckt <hi@transactional.buckt.dev>",
            to: email,
            subject: `DNS setup instructions for ${domain}`,
            react: DnsInstructionsEmail({
              senderName,
              orgName,
              domain,
              records,
            }),
          })
        )
      );

      const sent = results.filter((r) => r.status === "fulfilled").length;

      if (sent === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send instructions",
        });
      }

      return { sent };
    }),
});
