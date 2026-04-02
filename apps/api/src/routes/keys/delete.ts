import type { Context } from "hono"
import { eq, and } from "drizzle-orm"
import { apiKeys } from "@buckt/db"
import { db } from "../../lib/db"
import { success, error } from "../../lib/response"

export async function deleteKey(c: Context) {
  const orgId = c.get("orgId")
  const id = c.req.param("id") as string

  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.orgId, orgId)))
    .limit(1)

  if (!key) {
    return error(c, 404, "API key not found")
  }

  await db.delete(apiKeys).where(eq(apiKeys.id, id))

  return success(c, { id })
}
