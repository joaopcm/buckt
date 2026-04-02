import { Hono } from "hono"
import { eq, and, sql } from "drizzle-orm"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { buckets } from "@buckt/db"
import { requireAuth } from "../../middleware/auth"
import { db } from "../../lib/db"
import { s3 } from "../../lib/s3"
import { success, error } from "../../lib/response"

const app = new Hono()

app.put("/:bucketId/files/*", requireAuth("files:write"), async (c) => {
  const orgId = c.get("orgId")
  const bucketId = c.req.param("bucketId")
  const filePath = c.req.path.split("/files/")[1]

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
    .set({ storageUsedBytes: sql`${buckets.storageUsedBytes} + ${size}` })
    .where(eq(buckets.id, bucketId))

  return success(c, {
    key: filePath,
    size,
    contentType,
    lastModified: new Date().toISOString(),
  })
})

export default app
