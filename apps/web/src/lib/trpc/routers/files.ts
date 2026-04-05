import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { buckets } from "@buckt/db";
import { TRPCError } from "@trpc/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { s3 } from "@/lib/s3";
import { orgProcedure, router } from "../init";

export const filesRouter = router({
  list: orgProcedure
    .input(
      z.object({
        bucketId: z.string(),
        prefix: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().int().positive().max(1000).default(100),
      })
    )
    .query(async ({ ctx, input }) => {
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
      if (bucket.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Bucket is not active",
        });
      }

      const result = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket.s3BucketName,
          Prefix: input.prefix,
          Delimiter: "/",
          ContinuationToken: input.cursor,
          MaxKeys: input.limit,
        })
      );

      const folders = (result.CommonPrefixes ?? []).map((p) => p.Prefix ?? "");

      const files = (result.Contents ?? [])
        .filter((obj) => obj.Key !== input.prefix)
        .map((obj) => ({
          key: obj.Key ?? "",
          size: obj.Size ?? 0,
          lastModified: obj.LastModified?.toISOString() ?? "",
        }));

      return {
        folders,
        files,
        nextCursor: result.IsTruncated
          ? (result.NextContinuationToken ?? null)
          : null,
      };
    }),

  upload: orgProcedure
    .input(
      z.object({
        bucketId: z.string(),
        key: z.string().min(1),
        contentType: z.string().default("application/octet-stream"),
        data: z.string(),
      })
    )
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
      if (bucket.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Bucket is not active",
        });
      }

      const body = Buffer.from(input.data, "base64");

      let existingSize = 0;
      try {
        const head = await s3.send(
          new HeadObjectCommand({
            Bucket: bucket.s3BucketName,
            Key: input.key,
          })
        );
        existingSize = head.ContentLength ?? 0;
      } catch {
        // file doesn't exist yet
      }

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket.s3BucketName,
          Key: input.key,
          Body: body,
          ContentType: input.contentType,
        })
      );

      await ctx.db
        .update(buckets)
        .set({
          storageUsedBytes: sql`${buckets.storageUsedBytes} + ${body.length} - ${existingSize}`,
        })
        .where(eq(buckets.id, input.bucketId));

      return {
        key: input.key,
        size: body.length,
        contentType: input.contentType,
        url: `https://${bucket.customDomain}/${input.key}`,
      };
    }),

  delete: orgProcedure
    .input(z.object({ bucketId: z.string(), key: z.string().min(1) }))
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
      if (bucket.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Bucket is not active",
        });
      }

      let size = 0;
      try {
        const head = await s3.send(
          new HeadObjectCommand({
            Bucket: bucket.s3BucketName,
            Key: input.key,
          })
        );
        size = head.ContentLength ?? 0;
      } catch {
        // file may not exist
      }

      await s3.send(
        new DeleteObjectCommand({
          Bucket: bucket.s3BucketName,
          Key: input.key,
        })
      );

      if (size > 0) {
        await ctx.db
          .update(buckets)
          .set({
            storageUsedBytes: sql`GREATEST(${buckets.storageUsedBytes} - ${size}, 0)`,
          })
          .where(eq(buckets.id, input.bucketId));
      }

      return { key: input.key };
    }),

  deleteFolder: orgProcedure
    .input(z.object({ bucketId: z.string(), prefix: z.string().min(1) }))
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
      if (bucket.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Bucket is not active",
        });
      }

      let continuationToken: string | undefined;
      let deleted = 0;
      let totalBytes = 0;

      do {
        const list = await s3.send(
          new ListObjectsV2Command({
            Bucket: bucket.s3BucketName,
            Prefix: input.prefix,
            ContinuationToken: continuationToken,
          })
        );

        if (list.Contents?.length) {
          for (const obj of list.Contents) {
            totalBytes += obj.Size ?? 0;
          }
          await s3.send(
            new DeleteObjectsCommand({
              Bucket: bucket.s3BucketName,
              Delete: {
                Objects: list.Contents.map((o) => ({ Key: o.Key ?? "" })),
              },
            })
          );
          deleted += list.Contents.length;
        }

        continuationToken = list.IsTruncated
          ? list.NextContinuationToken
          : undefined;
      } while (continuationToken);

      if (totalBytes > 0) {
        await ctx.db
          .update(buckets)
          .set({
            storageUsedBytes: sql`GREATEST(${buckets.storageUsedBytes} - ${totalBytes}, 0)`,
          })
          .where(eq(buckets.id, input.bucketId));
      }

      return { prefix: input.prefix, deleted };
    }),
});
