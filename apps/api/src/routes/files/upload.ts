import type { Context } from "hono"
import { eq, and, sql } from "drizzle-orm"
import { PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3"
import { buckets } from "@buckt/db"
import { db } from "../../lib/db"
import { s3 } from "../../lib/s3"
import { success, error } from "../../lib/response"

export async function uploadFile(c: Context) {
  const orgId = c.get("orgId")
  const bucketId = c.req.param("bucketId") as string
  const filePath = c.req.path.replace(/^.*?\/files\//, "")

  if (!filePath) {
    return error(c, 400, "File path is required")
  }

  const [bucket] = await db
    .select()
    .from(buckets)
    .where(and(eq(buckets.id, bucketId), eq(buckets.orgId, orgId)))
    .limit(1)

  if (!bucket) {
    return error(c, 404, "Bucket not found")
  }

  if (bucket.status !== "active") {
    return error(c, 400, "Bucket is not active")
  }

  const body = await c.req.arrayBuffer()
  const size = body.byteLength
  const contentType = c.req.header("Content-Type") ?? "application/octet-stream"

  let existingSize = 0
  try {
    const head = await s3.send(
      new HeadObjectCommand({
        Bucket: bucket.s3BucketName,
        Key: filePath,
      })
    )
    existingSize = head.ContentLength ?? 0
  } catch {
    // file doesn't exist yet
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket.s3BucketName,
      Key: filePath,
      Body: Buffer.from(body),
      ContentType: contentType,
    })
  )

  await db
    .update(buckets)
    .set({
      storageUsedBytes: sql`${buckets.storageUsedBytes} + ${size} - ${existingSize}`,
    })
    .where(eq(buckets.id, bucketId))

  return success(c, {
    key: filePath,
    size,
    contentType,
    lastModified: new Date().toISOString(),
  })
}
