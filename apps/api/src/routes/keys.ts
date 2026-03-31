import { Hono } from "hono"
import { eq, and, gt, asc } from "drizzle-orm"
import { apiKeys } from "@buckt/db"
import { createKeySchema } from "@buckt/shared"
import { requireAuth } from "../middleware/auth"
import { db } from "../lib/db"
import { generateApiKey } from "../lib/hash"
import { success, error } from "../lib/response"

const app = new Hono()

app.post("/", requireAuth(), async (c) => {
  const isSystem = c.get("isSystemKey")
  if (!isSystem) {
    return error(c, 403, "Only system keys can create new API keys")
  }

  const body = await c.req.json()
  const parsed = createKeySchema.safeParse(body)
  if (!parsed.success) {
    return error(c, 400, parsed.error.issues[0].message)
  }

  const { name, permissions, expiresAt } = parsed.data
  const orgId = c.get("orgId")
  const { key, prefix, hashedKey } = generateApiKey()

  const [apiKey] = await db
    .insert(apiKeys)
    .values({
      orgId,
      name,
      hashedKey,
      prefix,
      permissions,
      system: false,
      expiresAt: expiresAt ?? null,
    })
    .returning()

  return c.json({
    data: { ...apiKey, key },
    error: null,
    meta: null,
  }, 201)
})

app.get("/", requireAuth(), async (c) => {
  const orgId = c.get("orgId")
  const cursor = c.req.query("cursor")
  const limit = Math.min(Number(c.req.query("limit")) || 20, 100)

  const conditions = [eq(apiKeys.orgId, orgId), eq(apiKeys.system, false)]
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

app.delete("/:id", requireAuth(), async (c) => {
  const isSystem = c.get("isSystemKey")
  if (!isSystem) {
    return error(c, 403, "Only system keys can revoke API keys")
  }

  const orgId = c.get("orgId")
  const id = c.req.param("id")

  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.orgId, orgId)))
    .limit(1)

  if (!key) {
    return error(c, 404, "API key not found")
  }

  if (key.system) {
    return error(c, 403, "Cannot delete system API key")
  }

  await db.delete(apiKeys).where(eq(apiKeys.id, id))

  return success(c, { id })
})

export default app
