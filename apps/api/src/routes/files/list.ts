import { Hono } from "hono"
import { eq, and } from "drizzle-orm"
import { ListObjectsV2Command } from "@aws-sdk/client-s3"
import { buckets } from "@buckt/db"
import { listFilesSchema } from "@buckt/shared"
import { requireAuth } from "../../middleware/auth"
import { db } from "../../lib/db"
import { s3 } from "../../lib/s3"
import { success, error } from "../../lib/response"

const app = new Hono()

app.get("/:bucketId/files", requireAuth("files:read"), async (c) => {
  const orgId = c.get("orgId")
  const bucketId = c.req.param("bucketId")

  const parsed = listFilesSchema.safeParse({
    prefix: c.req.query("prefix"),
    cursor: c.req.query("cursor"),
    limit: c.req.query("limit"),
  })

  if (!parsed.success) {
    return error(c, 400, parsed.error.issues[0].message)
  }

  const { prefix, cursor, limit } = parsed.data

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

  const result = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucket.s3BucketName,
      Prefix: prefix,
      MaxKeys: limit,
      ContinuationToken: cursor,
    })
  )

  const files = (result.Contents ?? []).map((obj) => ({
    key: obj.Key ?? "",
    size: obj.Size ?? 0,
    lastModified: (obj.LastModified ?? new Date()).toISOString(),
  }))

  return success(c, files, {
    nextCursor: result.NextContinuationToken ?? null,
    limit,
  })
})

export default app
