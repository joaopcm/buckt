import { Hono } from "hono"
import { eq, and } from "drizzle-orm"
import { buckets } from "@buckt/db"
import { requireAuth } from "../../middleware/auth"
import { db } from "../../lib/db"
import { success, error } from "../../lib/response"

const app = new Hono()

app.get("/:id", requireAuth("buckets:read"), async (c) => {
  const orgId = c.get("orgId")
  const id = c.req.param("id")

  const [bucket] = await db
    .select()
    .from(buckets)
    .where(and(eq(buckets.id, id), eq(buckets.orgId, orgId)))
    .limit(1)

  if (!bucket) {
    return error(c, 404, "Bucket not found")
  }

  return success(c, bucket)
})

export default app
