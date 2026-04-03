import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { buckets } from "@buckt/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { db } from "../../lib/db";
import { error, success } from "../../lib/response";
import { s3 } from "../../lib/s3";

const FILE_PATH_RE = /^.*?\/files\//;

export async function getFile(c: Context) {
  const orgId = c.get("orgId");
  const bucketId = c.req.param("bucketId") as string;
  const filePath = c.req.path.replace(FILE_PATH_RE, "");

  if (!filePath) {
    return error(c, 400, "File path is required");
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

  try {
    const head = await s3.send(
      new HeadObjectCommand({
        Bucket: bucket.s3BucketName,
        Key: filePath,
      })
    );

    return success(c, {
      key: filePath,
      size: head.ContentLength ?? 0,
      lastModified: (head.LastModified ?? new Date()).toISOString(),
      contentType: head.ContentType ?? "application/octet-stream",
      url: `https://${bucket.customDomain}/${filePath}`,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "NotFound") {
      return error(c, 404, "File not found");
    }
    throw err;
  }
}
