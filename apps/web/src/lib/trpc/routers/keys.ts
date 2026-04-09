import { apiKeys, buckets } from "@buckt/db";
import { createKeySchema } from "@buckt/shared";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, ilike, inArray, lt } from "drizzle-orm";
import { z } from "zod";
import { generateApiKey } from "@/utils/hash";
import { orgProcedure, router } from "../init";

export const keysRouter = router({
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
      const baseConditions = [eq(apiKeys.orgId, ctx.orgId)];
      if (search) {
        baseConditions.push(ilike(apiKeys.name, `%${search}%`));
      }

      const conditions = [...baseConditions];
      if (cursor) {
        conditions.push(lt(apiKeys.id, cursor));
      }

      const [items, [{ total }]] = await Promise.all([
        ctx.db
          .select({
            id: apiKeys.id,
            name: apiKeys.name,
            prefix: apiKeys.prefix,
            permissions: apiKeys.permissions,
            bucketIds: apiKeys.bucketIds,
            lastUsedAt: apiKeys.lastUsedAt,
            expiresAt: apiKeys.expiresAt,
            createdAt: apiKeys.createdAt,
          })
          .from(apiKeys)
          .where(and(...conditions))
          .orderBy(desc(apiKeys.createdAt))
          .limit(limit + 1),
        ctx.db
          .select({ total: count() })
          .from(apiKeys)
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

  create: orgProcedure
    .input(createKeySchema)
    .mutation(async ({ ctx, input }) => {
      const { name, permissions, expiresAt, bucketIds } = input;

      if (bucketIds && bucketIds.length > 0) {
        const validBuckets = await ctx.db
          .select({ id: buckets.id })
          .from(buckets)
          .where(
            and(eq(buckets.orgId, ctx.orgId), inArray(buckets.id, bucketIds))
          );
        const validIds = new Set(validBuckets.map((b) => b.id));
        const invalidIds = bucketIds.filter((id) => !validIds.has(id));
        if (invalidIds.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid bucket IDs: ${invalidIds.join(", ")}`,
          });
        }
      }

      const { key, prefix, hashedKey } = generateApiKey();

      const [apiKey] = await ctx.db
        .insert(apiKeys)
        .values({
          orgId: ctx.orgId,
          name,
          hashedKey,
          prefix,
          permissions,
          expiresAt: expiresAt ?? null,
          bucketIds: bucketIds ?? null,
        })
        .returning();

      return { ...apiKey, key };
    }),

  update: orgProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100),
        permissions: z.array(z.string()).min(1),
        bucketIds: z.array(z.string()).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: apiKeys.id })
        .from(apiKeys)
        .where(and(eq(apiKeys.id, input.id), eq(apiKeys.orgId, ctx.orgId)))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      if (input.bucketIds && input.bucketIds.length > 0) {
        const validBuckets = await ctx.db
          .select({ id: buckets.id })
          .from(buckets)
          .where(
            and(
              eq(buckets.orgId, ctx.orgId),
              inArray(buckets.id, input.bucketIds)
            )
          );
        const validIds = new Set(validBuckets.map((b) => b.id));
        const invalidIds = input.bucketIds.filter((id) => !validIds.has(id));
        if (invalidIds.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid bucket IDs: ${invalidIds.join(", ")}`,
          });
        }
      }

      const [updated] = await ctx.db
        .update(apiKeys)
        .set({
          name: input.name,
          permissions: input.permissions,
          ...(input.bucketIds !== undefined && {
            bucketIds: input.bucketIds,
          }),
        })
        .where(eq(apiKeys.id, input.id))
        .returning();

      return updated;
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [apiKey] = await ctx.db
        .select({ id: apiKeys.id })
        .from(apiKeys)
        .where(and(eq(apiKeys.id, input.id), eq(apiKeys.orgId, ctx.orgId)))
        .limit(1);

      if (!apiKey) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "API key not found",
        });
      }

      await ctx.db
        .delete(apiKeys)
        .where(and(eq(apiKeys.id, input.id), eq(apiKeys.orgId, ctx.orgId)));

      return { id: input.id };
    }),
});
