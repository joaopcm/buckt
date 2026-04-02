import type { Context } from "hono"
import { eq, and } from "drizzle-orm"
import { buckets } from "@buckt/db"
import { db } from "../../lib/db"
import { success, error } from "../../lib/response"
import { provisionBucket } from "../../trigger/provision-bucket"

export async function retryBucket(c: Context) {
  const orgId = c.get("orgId") as string
  const id = c.req.param("id") as string

  const [bucket] = await db
    .select()
    .from(buckets)
    .where(and(eq(buckets.id, id), eq(buckets.orgId, orgId)))
    .limit(1)

  if (!bucket) return error(c, 404, "Bucket not found")
  if (bucket.status !== "failed")
    return error(c, 400, "Only failed buckets can be retried")

  await db
    .update(buckets)
    .set({ status: "pending" })
    .where(eq(buckets.id, id))

  const handle = await provisionBucket.trigger({ bucketId: id })
  await db
    .update(buckets)
    .set({ provisioningJobId: handle.id })
    .where(eq(buckets.id, id))

  return success(c, { id, status: "pending" })
}
