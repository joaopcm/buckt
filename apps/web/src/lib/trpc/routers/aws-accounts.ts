import { awsAccounts, buckets, subscription } from "@buckt/db";
import {
  connectAwsAccountSchema,
  importBucketsSchema,
  type ManagedSettings,
  type PlanName,
  updateAwsAccountSchema,
} from "@buckt/shared";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, ilike, lt } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, orgProcedure, router } from "../init";

export const awsAccountsRouter = router({
  list: orgProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().int().positive().max(100).default(20),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit, search } = input;
      const baseConditions = [eq(awsAccounts.orgId, ctx.orgId)];
      if (search) {
        baseConditions.push(ilike(awsAccounts.label, `%${search}%`));
      }

      const conditions = [...baseConditions];
      if (cursor) {
        conditions.push(lt(awsAccounts.id, cursor));
      }

      const [items, [{ total }]] = await Promise.all([
        ctx.db
          .select()
          .from(awsAccounts)
          .where(and(...conditions))
          .orderBy(desc(awsAccounts.createdAt))
          .limit(limit + 1),
        ctx.db
          .select({ total: count() })
          .from(awsAccounts)
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
      const [account] = await ctx.db
        .select()
        .from(awsAccounts)
        .where(
          and(eq(awsAccounts.id, input.id), eq(awsAccounts.orgId, ctx.orgId))
        )
        .limit(1);

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "AWS account not found",
        });
      }

      return account;
    }),

  connect: adminProcedure
    .input(connectAwsAccountSchema)
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
      if (plan === "free") {
        throw new TRPCError({
          code: "PAYMENT_REQUIRED",
          message: "BYOA requires a paid plan. Upgrade to enable.",
        });
      }

      const externalId = crypto.randomUUID();
      const pendingAccountId = `pending-${crypto.randomUUID().slice(0, 8)}`;

      const [account] = await ctx.db
        .insert(awsAccounts)
        .values({
          orgId: ctx.orgId,
          awsAccountId: pendingAccountId,
          externalId,
          label: input.label,
          status: "pending",
        })
        .returning();

      return account;
    }),

  update: adminProcedure
    .input(z.object({ id: z.string() }).merge(updateAwsAccountSchema))
    .mutation(async ({ ctx, input }) => {
      const [account] = await ctx.db
        .select()
        .from(awsAccounts)
        .where(
          and(eq(awsAccounts.id, input.id), eq(awsAccounts.orgId, ctx.orgId))
        )
        .limit(1);

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "AWS account not found",
        });
      }

      const { id, ...updates } = input;

      const [updated] = await ctx.db
        .update(awsAccounts)
        .set(updates)
        .where(eq(awsAccounts.id, id))
        .returning();

      return updated;
    }),

  validate: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [account] = await ctx.db
        .select()
        .from(awsAccounts)
        .where(
          and(eq(awsAccounts.id, input.id), eq(awsAccounts.orgId, ctx.orgId))
        )
        .limit(1);

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "AWS account not found",
        });
      }

      if (!account.roleArn) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Role ARN is required before validation",
        });
      }

      const { validateRole } = await import("@/lib/trpc/routers/aws-validate");
      const result = await validateRole(account.roleArn, account.externalId);

      if (result.valid) {
        const [updated] = await ctx.db
          .update(awsAccounts)
          .set({
            status: "active",
            lastValidatedAt: new Date(),
            awsAccountId: result.accountId ?? account.awsAccountId,
          })
          .where(eq(awsAccounts.id, input.id))
          .returning();
        return updated;
      }

      await ctx.db
        .update(awsAccounts)
        .set({ status: "failed" })
        .where(eq(awsAccounts.id, input.id));

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Validation failed: ${result.error}`,
      });
    }),

  disconnect: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [account] = await ctx.db
        .select()
        .from(awsAccounts)
        .where(
          and(eq(awsAccounts.id, input.id), eq(awsAccounts.orgId, ctx.orgId))
        )
        .limit(1);

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "AWS account not found",
        });
      }

      await ctx.db.delete(buckets).where(eq(buckets.awsAccountId, input.id));

      await ctx.db.delete(awsAccounts).where(eq(awsAccounts.id, input.id));

      return { success: true };
    }),

  listS3Buckets: orgProcedure
    .input(
      z.object({
        id: z.string(),
        cursor: z.string().optional(),
        limit: z.number().int().positive().max(100).default(20),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [account] = await ctx.db
        .select()
        .from(awsAccounts)
        .where(
          and(eq(awsAccounts.id, input.id), eq(awsAccounts.orgId, ctx.orgId))
        )
        .limit(1);

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "AWS account not found",
        });
      }

      if (account.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "AWS account is not active",
        });
      }

      const { assumeRole } = await import("@/lib/trpc/routers/aws-validate");
      const credentials = await assumeRole(account.roleArn, account.externalId);

      const { ListBucketsCommand, S3Client } = await import(
        "@aws-sdk/client-s3"
      );
      const s3 = new S3Client({ region: "us-east-1", credentials });
      const result = await s3.send(new ListBucketsCommand({}));

      let allBuckets = (result.Buckets ?? []).map((b) => ({
        name: b.Name ?? "",
        creationDate: b.CreationDate?.toISOString() ?? "",
      }));

      if (input.search) {
        const term = input.search.toLowerCase();
        allBuckets = allBuckets.filter((b) =>
          b.name.toLowerCase().includes(term)
        );
      }

      const total = allBuckets.length;

      if (input.cursor) {
        const idx = allBuckets.findIndex((b) => b.name === input.cursor);
        if (idx >= 0) {
          allBuckets = allBuckets.slice(idx + 1);
        }
      }

      const hasMore = allBuckets.length > input.limit;
      const items = allBuckets.slice(0, input.limit);

      return {
        items,
        nextCursor: hasMore ? (items.at(-1)?.name ?? null) : null,
        total,
      };
    }),

  importBuckets: adminProcedure
    .input(z.object({ id: z.string() }).merge(importBucketsSchema))
    .mutation(async ({ ctx, input }) => {
      const [account] = await ctx.db
        .select()
        .from(awsAccounts)
        .where(
          and(eq(awsAccounts.id, input.id), eq(awsAccounts.orgId, ctx.orgId))
        )
        .limit(1);

      if (!account || account.status !== "active") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Active AWS account not found",
        });
      }

      const { assumeRole } = await import("@/lib/trpc/routers/aws-validate");
      const credentials = await assumeRole(account.roleArn, account.externalId);

      const { getBucketRegion, readBucketSettings } = await import(
        "@/lib/trpc/routers/bucket-import"
      );

      const { findDistributionForBucket } = await import(
        "@/lib/trpc/routers/cloudfront-import"
      );

      const defaultManagedSettings: ManagedSettings = {
        visibility: false,
        cache: false,
        cors: false,
        lifecycle: false,
        optimization: false,
      };

      const imported: (typeof buckets.$inferSelect)[] = [];

      for (const bucketName of input.bucketNames) {
        const region = await getBucketRegion(bucketName, credentials);
        const settings = await readBucketSettings(
          bucketName,
          region,
          credentials
        );
        const distInfo = await findDistributionForBucket(
          bucketName,
          region,
          credentials
        );

        const slug = distInfo?.customDomain
          ? distInfo.customDomain.replace(/\./g, "-")
          : bucketName.replace(/\./g, "-");

        const [bucket] = await ctx.db
          .insert(buckets)
          .values({
            orgId: ctx.orgId,
            name: bucketName,
            slug,
            s3BucketName: bucketName,
            region,
            customDomain: distInfo?.customDomain ?? "",
            cloudfrontDistributionId: distInfo?.distributionId ?? null,
            acmCertArn: distInfo?.certArn ?? null,
            visibility: settings.visibility,
            corsOrigins: settings.corsOrigins,
            lifecycleTtlDays: settings.lifecycleTtlDays,
            awsAccountId: input.id,
            isImported: true,
            managedSettings: defaultManagedSettings,
            status: "active",
          })
          .returning();

        imported.push(bucket);
      }

      return imported;
    }),
});
