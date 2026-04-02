import type { Context } from "hono"
import { eq } from "drizzle-orm"
import { buckets } from "@buckt/db"
import { createBucketSchema } from "@buckt/shared"
import { db } from "../../lib/db"
import { error } from "../../lib/response"
import { provisionBucket } from "../../trigger/provision-bucket"

export async function createBucket(c: Context) {
  const body = await c.req.json()
  const parsed = createBucketSchema.safeParse(body)
  if (!parsed.success) {
    return error(c, 400, parsed.error.issues[0].message)
  }

  const { name, customDomain } = parsed.data
  const orgId = c.get("orgId")
  const slug = customDomain.replace(/\./g, "-")
  const s3BucketName = `buckt-${orgId.slice(0, 8)}-${slug}`

  const [existing] = await db
    .select({ id: buckets.id })
    .from(buckets)
    .where(eq(buckets.customDomain, customDomain))
    .limit(1)

  if (existing) {
    return error(c, 409, "Domain already in use")
  }

  const [bucket] = await db
    .insert(buckets)
    .values({ orgId, name, slug, s3BucketName, customDomain, status: "pending" })
    .returning()

  const handle = await provisionBucket.trigger({ bucketId: bucket.id })
  await db
    .update(buckets)
    .set({ provisioningJobId: handle.id })
    .where(eq(buckets.id, bucket.id))

  return c.json({ data: bucket, error: null, meta: null }, 201)
}
