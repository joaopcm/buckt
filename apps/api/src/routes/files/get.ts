import { Hono } from "hono"
import { eq, and } from "drizzle-orm"
import { HeadObjectCommand } from "@aws-sdk/client-s3"
import { buckets } from "@buckt/db"
import { requireAuth } from "../../middleware/auth"
import { db } from "../../lib/db"
import { s3 } from "../../lib/s3"
import { success, error } from "../../lib/response"

const app = new Hono()

app.get("/:bucketId/files/*", requireAuth("files:read"), async (c) => {
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

  try {
    const head = await s3.send(
      new HeadObjectCommand({
        Bucket: bucket.s3BucketName,
        Key: filePath,
      })
    )

    return success(c, {
      key: filePath,
      size: head.ContentLength!,
      lastModified: head.LastModified!.toISOString(),
      contentType: head.ContentType!,
      url: `https://${bucket.customDomain}/${filePath}`,
    })
  } catch (err) {
    if (err instanceof Error && err.name === "NotFound") {
      return error(c, 404, "File not found")
    }
    throw err
  }
})

export default app
