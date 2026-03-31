import { Hono } from "hono"
import { eq, and, count } from "drizzle-orm"
import { buckets } from "@buckt/db"
import { createBucketSchema, listBucketsSchema } from "@buckt/shared"
import { requireAuth } from "../middleware/auth"
import { db } from "../lib/db"
import { success, error } from "../lib/response"

const app = new Hono()

app.post("/", requireAuth("buckets:write"), async (c) => {
  const body = await c.req.json()
  const parsed = createBucketSchema.safeParse(body)
  if (!parsed.success) {
    return error(c, 400, parsed.error.issues[0].message)
  }

  const { name, customDomain } = parsed.data
  const orgId = c.get("orgId")
  const slug = customDomain.replace(/\./g, "-")
  const s3BucketName = `buckt-${orgId.slice(0, 8)}-${slug}`

  const [existing] = await db
    .select({ id: buckets.id })
    .from(buckets)
    .where(eq(buckets.customDomain, customDomain))
    .limit(1)

  if (existing) {
    return error(c, 409, "Domain already in use")
  }

  const [bucket] = await db
    .insert(buckets)
    .values({
      orgId,
      name,
      slug,
      s3BucketName,
      customDomain,
      status: "pending",
    })
    .returning()

  // TODO: trigger provisioning job via Trigger.dev (issue #5)

  return c.json({ data: bucket, error: null, meta: null }, 201)
})

app.get("/", requireAuth("buckets:read"), async (c) => {
  const orgId = c.get("orgId")
  const query = listBucketsSchema.safeParse(c.req.query())
  if (!query.success) {
    return error(c, 400, query.error.issues[0].message)
  }

  const { status, page, limit } = query.data
  const offset = (page - 1) * limit

  const conditions = [eq(buckets.orgId, orgId)]
  if (status) {
    conditions.push(eq(buckets.status, status))
  }

  const where = conditions.length === 1 ? conditions[0] : and(...conditions)

  const [items, [total]] = await Promise.all([
    db.select().from(buckets).where(where).limit(limit).offset(offset),
    db.select({ count: count() }).from(buckets).where(where),
  ])

  return success(c, items, {
    page,
    limit,
    total: total.count,
    totalPages: Math.ceil(total.count / limit),
  })
})

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
