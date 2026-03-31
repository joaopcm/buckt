import { Hono } from "hono"
import { eq, and, gt, asc } from "drizzle-orm"
import { buckets } from "@buckt/db"
import { listBucketsSchema } from "@buckt/shared"
import { requireAuth } from "../../middleware/auth"
import { db } from "../../lib/db"
import { success, error } from "../../lib/response"

const app = new Hono()

app.get("/", requireAuth("buckets:read"), async (c) => {
  const orgId = c.get("orgId")
  const query = listBucketsSchema.safeParse(c.req.query())
  if (!query.success) {
    return error(c, 400, query.error.issues[0].message)
  }

  const { status, cursor, limit } = query.data

  const conditions = [eq(buckets.orgId, orgId)]
  if (status) {
    conditions.push(eq(buckets.status, status))
  }
  if (cursor) {
    conditions.push(gt(buckets.id, cursor))
  }

  const items = await db
    .select()
    .from(buckets)
    .where(and(...conditions))
    .orderBy(asc(buckets.id))
    .limit(limit + 1)

  const hasMore = items.length > limit
  if (hasMore) items.pop()

  const nextCursor = hasMore ? items[items.length - 1].id : null

  return success(c, items, { nextCursor, limit })
})

export default app
