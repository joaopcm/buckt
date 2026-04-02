import type { Context } from "hono"
import { eq, and } from "drizzle-orm"
import { buckets } from "@buckt/db"
import { db } from "../../lib/db"
import { success, error } from "../../lib/response"

export async function getBucket(c: Context) {
  const orgId = c.get("orgId")
  const id = c.req.param("id") as string

  const [bucket] = await db
    .select()
    .from(buckets)
    .where(and(eq(buckets.id, id), eq(buckets.orgId, orgId)))
    .limit(1)

  if (!bucket) {
    return error(c, 404, "Bucket not found")
  }

  return success(c, bucket)
}
