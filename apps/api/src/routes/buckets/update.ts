import { buckets } from "@buckt/db";
import { updateBucketSchema } from "@buckt/shared";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { db } from "../../lib/db";
import { error, success } from "../../lib/response";

export async function updateBucket(c: Context) {
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id") as string;

  const body = await c.req.json();
  const parsed = updateBucketSchema.safeParse(body);

  if (!parsed.success) {
    return error(c, 400, "Invalid request body");
  }

  const [bucket] = await db
    .select()
    .from(buckets)
    .where(and(eq(buckets.id, id), eq(buckets.orgId, orgId)))
    .limit(1);

  if (!bucket) {
    return error(c, 404, "Bucket not found");
  }

  const [updated] = await db
    .update(buckets)
    .set({ name: parsed.data.name })
    .where(eq(buckets.id, id))
    .returning();

  return success(c, updated);
}
