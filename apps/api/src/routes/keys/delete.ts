import { Hono } from "hono"
import { eq, and } from "drizzle-orm"
import { apiKeys } from "@buckt/db"
import { requireAuth } from "../../middleware/auth"
import { db } from "../../lib/db"
import { success, error } from "../../lib/response"

const app = new Hono()

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
