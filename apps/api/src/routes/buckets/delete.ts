import { buckets } from "@buckt/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { isBucketInScope } from "../../lib/bucket-scope";
import { db } from "../../lib/db";
import { error, success } from "../../lib/response";
import { destroyBucket } from "../../trigger/destroy-bucket";

export async function deleteBucket(c: Context) {
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

  if (bucket.status === "deleting") {
    return error(c, 409, "Bucket is already being deleted");
  }

  await db
    .update(buckets)
    .set({ status: "deleting" })
    .where(eq(buckets.id, id));

  await destroyBucket.trigger({ bucketId: id });

  return success(c, { id, status: "deleting" });
}
