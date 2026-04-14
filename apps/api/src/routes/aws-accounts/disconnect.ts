import { awsAccounts, buckets } from "@buckt/db";
import { and, eq, sql } from "drizzle-orm";
import type { Context } from "hono";
import { db } from "../../lib/db";
import { error } from "../../utils/response";

export async function disconnectAwsAccount(c: Context) {
  const orgId = c.get("orgId");
  const id = c.req.param("id") as string;

  const [account] = await db
    .select()
    .from(awsAccounts)
    .where(and(eq(awsAccounts.id, id), eq(awsAccounts.orgId, orgId)))
    .limit(1);

  if (!account) {
    return error(c, 404, "AWS account not found");
  }

  const deletedBuckets = await db
    .delete(buckets)
    .where(eq(buckets.awsAccountId, id))
    .returning({ id: buckets.id });

  for (const { id: bucketId } of deletedBuckets) {
    await db.execute(sql`
      UPDATE api_keys
      SET bucket_ids = COALESCE(
        (SELECT jsonb_agg(elem)
         FROM jsonb_array_elements(bucket_ids) AS elem
         WHERE elem::text != ${JSON.stringify(bucketId)}),
        '[]'::jsonb
      )
      WHERE bucket_ids IS NOT NULL
        AND bucket_ids @> ${JSON.stringify([bucketId])}::jsonb
    `);
  }

  await db.delete(awsAccounts).where(eq(awsAccounts.id, id));

  return c.body(null, 204);
}
