import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { awsAccounts, buckets, subscription } from "@buckt/db";
import {
  CACHE_PRESET_MAP,
  MIN_OPTIMIZATION_BYTES,
  OPTIMIZABLE_CONTENT_TYPES,
  PLAN_LIMITS,
  type PlanName,
} from "@buckt/shared";
import { tasks } from "@trigger.dev/sdk/v3";
import { TRPCError } from "@trpc/server";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getS3Client } from "@/lib/s3";
import type { Context } from "../init";
import { orgProcedure, router } from "../init";
import { assumeRole } from "./aws-validate";

type BucketRow = typeof buckets.$inferSelect;

async function getBucketClient(
  ctx: Context,
  bucket: BucketRow
): Promise<S3Client> {
  let credentials: Awaited<ReturnType<typeof assumeRole>> | undefined;
  if (bucket.awsAccountId) {
    const [awsAccount] = await ctx.db
      .select()
      .from(awsAccounts)
      .where(eq(awsAccounts.id, bucket.awsAccountId))
      .limit(1);

    if (!awsAccount) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "AWS account for this bucket not found",
      });
    }

    credentials = await assumeRole(awsAccount.roleArn, awsAccount.externalId);
  }

  return getS3Client(bucket.region, credentials);
}

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

      const s3 = await getBucketClient(ctx, bucket);

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

      const s3 = await getBucketClient(ctx, bucket);

      const body = Buffer.from(input.data, "base64");

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

      const orgBuckets = await ctx.db
        .select({ storageUsedBytes: buckets.storageUsedBytes })
        .from(buckets)
        .where(
          and(eq(buckets.orgId, ctx.orgId), ne(buckets.status, "deleting"))
        );
      const totalStorage = orgBuckets.reduce(
        (sum, b) => sum + (b.storageUsedBytes ?? 0),
        0
      );

      if (totalStorage + body.length > limits.maxStorageBytes) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Storage limit exceeded. Upgrade your plan.",
        });
      }

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

      const cacheControl =
        bucket.cacheControlOverride ??
        CACHE_PRESET_MAP[bucket.cachePreset as keyof typeof CACHE_PRESET_MAP] ??
        CACHE_PRESET_MAP.standard;

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket.s3BucketName,
          Key: input.key,
          Body: body,
          ContentType: input.contentType,
          CacheControl: cacheControl,
        })
      );

      await ctx.db
        .update(buckets)
        .set({
          storageUsedBytes: sql`${buckets.storageUsedBytes} + ${body.length} - ${existingSize}`,
        })
        .where(eq(buckets.id, input.bucketId));

      if (
        bucket.optimizationMode !== "none" &&
        OPTIMIZABLE_CONTENT_TYPES.has(input.contentType) &&
        body.length >= MIN_OPTIMIZATION_BYTES
      ) {
        await tasks.trigger("optimize-file", {
          bucketId: bucket.id,
          s3BucketName: bucket.s3BucketName,
          fileKey: input.key,
          contentType: input.contentType,
          originalSize: body.length,
          mode: bucket.optimizationMode,
          cacheControl,
        });
      }

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

      const s3 = await getBucketClient(ctx, bucket);

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

      const s3 = await getBucketClient(ctx, bucket);

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

  createFolder: orgProcedure
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

      const s3 = await getBucketClient(ctx, bucket);

      const folderKey = input.key.endsWith("/") ? input.key : `${input.key}/`;

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket.s3BucketName,
          Key: folderKey,
          Body: Buffer.alloc(0),
          ContentType: "application/x-directory",
        })
      );

      return { key: folderKey };
    }),

  renameFolder: orgProcedure
    .input(
      z.object({
        bucketId: z.string(),
        oldPrefix: z.string().min(1),
        newPrefix: z.string().min(1),
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

      const s3 = await getBucketClient(ctx, bucket);

      const oldPrefix = input.oldPrefix.endsWith("/")
        ? input.oldPrefix
        : `${input.oldPrefix}/`;
      const newPrefix = input.newPrefix.endsWith("/")
        ? input.newPrefix
        : `${input.newPrefix}/`;

      let continuationToken: string | undefined;
      let moved = 0;

      do {
        const list = await s3.send(
          new ListObjectsV2Command({
            Bucket: bucket.s3BucketName,
            Prefix: oldPrefix,
            ContinuationToken: continuationToken,
          })
        );

        for (const obj of list.Contents ?? []) {
          if (!obj.Key) {
            continue;
          }
          const newKey = obj.Key.replace(oldPrefix, newPrefix);
          await s3.send(
            new CopyObjectCommand({
              Bucket: bucket.s3BucketName,
              CopySource: `${bucket.s3BucketName}/${obj.Key}`,
              Key: newKey,
            })
          );
          moved++;
        }

        if (list.Contents?.length) {
          await s3.send(
            new DeleteObjectsCommand({
              Bucket: bucket.s3BucketName,
              Delete: {
                Objects: list.Contents.map((o) => ({ Key: o.Key ?? "" })),
              },
            })
          );
        }

        continuationToken = list.IsTruncated
          ? list.NextContinuationToken
          : undefined;
      } while (continuationToken);

      return { oldPrefix, newPrefix, moved };
    }),
});
