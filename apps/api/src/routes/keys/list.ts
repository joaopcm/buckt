import { Hono } from "hono"
import { eq, and, gt, asc } from "drizzle-orm"
import { apiKeys } from "@buckt/db"
import { requireAuth } from "../../middleware/auth"
import { db } from "../../lib/db"
import { success } from "../../lib/response"

const app = new Hono()

app.get("/", requireAuth(), async (c) => {
  const orgId = c.get("orgId")
  const cursor = c.req.query("cursor")
  const limit = Math.min(Number(c.req.query("limit")) || 20, 100)

  const conditions = [eq(apiKeys.orgId, orgId)]
  if (cursor) {
    conditions.push(gt(apiKeys.id, cursor))
  }

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      permissions: apiKeys.permissions,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(and(...conditions))
    .orderBy(asc(apiKeys.id))
    .limit(limit + 1)

  const hasMore = keys.length > limit
  if (hasMore) keys.pop()

  const nextCursor = hasMore ? keys[keys.length - 1].id : null

  return success(c, keys, { nextCursor, limit })
})

export default app
