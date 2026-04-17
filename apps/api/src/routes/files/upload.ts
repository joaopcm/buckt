import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { buckets } from "@buckt/db";
import {
  CACHE_PRESET_MAP,
  type ManagedSettings,
  MIN_OPTIMIZATION_BYTES,
  OPTIMIZABLE_CONTENT_TYPES,
  OPTIMIZATION_MODES,
} from "@buckt/shared";
import { tasks } from "@trigger.dev/sdk/v3";
import { and, eq, sql } from "drizzle-orm";
import type { Context } from "hono";
import { resolveCredentials } from "../../lib/aws/client-factory";
import { db } from "../../lib/db";
import { getS3Client } from "../../lib/s3";
import { isBucketInScope } from "../../utils/bucket-scope";
import { error, success } from "../../utils/response";

const FILE_PATH_RE = /^.*?\/files\//;

type Bucket = typeof buckets.$inferSelect;

function resolveCacheControl(
  c: Context,
  bucket: Bucket,
  managed: ManagedSettings
): string | undefined {
  if (bucket.isImported && managed.cache !== true) {
    return c.req.header("Cache-Control");
  }
  return (
    bucket.cacheControlOverride ??
    CACHE_PRESET_MAP[bucket.cachePreset as keyof typeof CACHE_PRESET_MAP] ??
    CACHE_PRESET_MAP.standard
  );
}

function resolveOptimizationMode(
  bucket: Bucket,
  managed: ManagedSettings,
  headerMode: string | undefined
): string {
  if (bucket.isImported && managed.optimization !== true) {
    return headerMode ?? "none";
  }
  return headerMode ?? bucket.optimizationMode;
}

function shouldOptimize(
  mode: string,
  contentType: string,
  size: number
): boolean {
  return (
    mode !== "none" &&
    OPTIMIZABLE_CONTENT_TYPES.has(contentType) &&
    size >= MIN_OPTIMIZATION_BYTES
  );
}

export async function uploadFile(c: Context) {
  const orgId = c.get("orgId");
  const bucketId = c.req.param("bucketId") as string;

  if (!isBucketInScope(c, bucketId)) {
    return error(c, 404, "Bucket not found");
  }
  const filePath = c.req.path.replace(FILE_PATH_RE, "");

  if (!filePath) {
    return error(c, 400, "File path is required");
  }

  const optimizationHeader = c.req.header("X-Buckt-Optimization");
  if (
    optimizationHeader &&
    !OPTIMIZATION_MODES.includes(optimizationHeader as never)
  ) {
    return error(
      c,
      400,
      "Invalid X-Buckt-Optimization value. Must be: none, light, balanced, or maximum"
    );
  }

  if (
    optimizationHeader &&
    optimizationHeader !== "none" &&
    c.get("plan") === "free"
  ) {
    return error(
      c,
      402,
      "Optimization requires a paid plan. Upgrade to enable."
    );
  }

  const [bucket] = await db
    .select()
    .from(buckets)
    .where(and(eq(buckets.id, bucketId), eq(buckets.orgId, orgId)))
    .limit(1);

  if (!bucket) {
    return error(c, 404, "Bucket not found");
  }

  if (bucket.status !== "active") {
    return error(c, 400, "Bucket is not active");
  }

  const body = await c.req.arrayBuffer();
  const size = body.byteLength;
  const contentType =
    c.req.header("Content-Type") ?? "application/octet-stream";

  const planLimits = c.get("planLimits");
  const orgBuckets = await db
    .select({ storageUsedBytes: buckets.storageUsedBytes })
    .from(buckets)
    .where(eq(buckets.orgId, orgId));
  const totalStorage = orgBuckets.reduce(
    (sum, b) => sum + (b.storageUsedBytes ?? 0),
    0
  );
  if (totalStorage + size > planLimits.maxStorageBytes) {
    return error(c, 402, "Storage limit exceeded. Upgrade your plan.");
  }

  const credentials = await resolveCredentials(bucket.awsAccountId);
  const managed = (bucket.managedSettings ?? {}) as ManagedSettings;

  let existingSize = 0;
  try {
    const head = await getS3Client(bucket.region, credentials).send(
      new HeadObjectCommand({
        Bucket: bucket.s3BucketName,
        Key: filePath,
      })
    );
    existingSize = head.ContentLength ?? 0;
  } catch {
    // file doesn't exist yet
  }

  const cacheControl = resolveCacheControl(c, bucket, managed);

  await getS3Client(bucket.region, credentials).send(
    new PutObjectCommand({
      Bucket: bucket.s3BucketName,
      Key: filePath,
      Body: Buffer.from(body),
      ContentType: contentType,
      ...(cacheControl !== undefined && { CacheControl: cacheControl }),
    })
  );

  await db
    .update(buckets)
    .set({
      storageUsedBytes: sql`${buckets.storageUsedBytes} + ${size} - ${existingSize}`,
    })
    .where(eq(buckets.id, bucketId));

  const effectiveMode = resolveOptimizationMode(
    bucket,
    managed,
    optimizationHeader
  );

  if (shouldOptimize(effectiveMode, contentType, size)) {
    await tasks.trigger("optimize-file", {
      bucketId: bucket.id,
      awsAccountId: bucket.awsAccountId,
      s3BucketName: bucket.s3BucketName,
      region: bucket.region,
      fileKey: filePath,
      contentType,
      originalSize: size,
      mode: effectiveMode,
      cacheControl: cacheControl ?? null,
    });
  }

  return success(c, {
    key: filePath,
    size,
    contentType,
    lastModified: new Date().toISOString(),
  });
}
