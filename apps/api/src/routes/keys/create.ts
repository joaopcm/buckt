import { Hono } from "hono"
import { apiKeys } from "@buckt/db"
import { createKeySchema, PERMISSIONS } from "@buckt/shared"
import { requireAuth } from "../../middleware/auth"
import { db } from "../../lib/db"
import { generateApiKey } from "../../lib/hash"
import { error } from "../../lib/response"

const app = new Hono()

app.post("/", requireAuth(...PERMISSIONS), async (c) => {
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
      expiresAt: expiresAt ?? null,
    })
    .returning()

  return c.json({ data: { ...apiKey, key }, error: null, meta: null }, 201)
})

export default app
