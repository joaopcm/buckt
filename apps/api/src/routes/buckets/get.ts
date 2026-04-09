import { buckets } from "@buckt/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { isBucketInScope } from "../../lib/bucket-scope";
import { db } from "../../lib/db";
import { error, success } from "../../lib/response";

export async function getBucket(c: Context) {
  const orgId = c.get("orgId");
  const id = c.req.param("id") as string;

  if (!isBucketInScope(c, id)) {
    return error(c, 404, "Bucket not found");
  }

  const [bucket] = await db
    .select()
    .from(buckets)
    .where(and(eq(buckets.id, id), eq(buckets.orgId, orgId)))
    .limit(1);

  if (!bucket) {
    return error(c, 404, "Bucket not found");
  }

  return success(c, bucket);
}
