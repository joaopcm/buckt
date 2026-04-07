import { buckets } from "@buckt/db";
import { updateBucketSchema } from "@buckt/shared";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import {
  setBucketCors,
  setBucketLifecycle,
  setBucketPrivate,
  setBucketPublic,
} from "../../lib/aws/bucket-settings";
import { db } from "../../lib/db";
import { error, success } from "../../lib/response";

export async function updateBucket(c: Context) {
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id") as string;

  const body = await c.req.json();
  const parsed = updateBucketSchema.safeParse(body);

  if (!parsed.success) {
    return error(c, 400, parsed.error.issues[0].message);
  }

  const [bucket] = await db
    .select()
    .from(buckets)
    .where(and(eq(buckets.id, id), eq(buckets.orgId, orgId)))
    .limit(1);

  if (!bucket) {
    return error(c, 404, "Bucket not found");
  }

  const updates = parsed.data;

  if (
    updates.visibility !== undefined &&
    updates.visibility !== bucket.visibility
  ) {
    if (updates.visibility === "private") {
      await setBucketPrivate(bucket.s3BucketName);
    } else {
      await setBucketPublic(bucket.s3BucketName);
    }
  }

  if (updates.corsOrigins !== undefined) {
    await setBucketCors(bucket.s3BucketName, updates.corsOrigins);
  }

  if (updates.lifecycleTtlDays !== undefined) {
    await setBucketLifecycle(bucket.s3BucketName, updates.lifecycleTtlDays);
  }

  const [updated] = await db
    .update(buckets)
    .set(updates)
    .where(eq(buckets.id, id))
    .returning();

  return success(c, updated);
}
