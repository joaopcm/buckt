import { Hono } from "hono"
import { eq, and } from "drizzle-orm"
import { buckets } from "@buckt/db"
import { requireAuth } from "../../middleware/auth"
import { db } from "../../lib/db"
import { success, error } from "../../lib/response"

const app = new Hono()

app.delete("/:id", requireAuth("buckets:delete"), async (c) => {
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

  if (bucket.status === "deleting") {
    return error(c, 409, "Bucket is already being deleted")
  }

  await db
    .update(buckets)
    .set({ status: "deleting" })
    .where(eq(buckets.id, id))

  // TODO: trigger destroy job via Trigger.dev (issue #5)

  return success(c, { id, status: "deleting" })
})

export default app
