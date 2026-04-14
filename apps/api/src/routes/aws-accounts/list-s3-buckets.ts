import { ListBucketsCommand, S3Client } from "@aws-sdk/client-s3";
import { awsAccounts } from "@buckt/db";
import { listS3BucketsSchema } from "@buckt/shared";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { assumeRole } from "../../lib/aws/sts";
import { db } from "../../lib/db";
import { error, success } from "../../utils/response";

export async function listS3Buckets(c: Context) {
  const orgId = c.get("orgId");
  const id = c.req.param("id") as string;
  const query = listS3BucketsSchema.safeParse(c.req.query());
  if (!query.success) {
    return error(c, 400, query.error.issues[0].message);
  }

  const { cursor, limit } = query.data;

  const [account] = await db
    .select()
    .from(awsAccounts)
    .where(and(eq(awsAccounts.id, id), eq(awsAccounts.orgId, orgId)))
    .limit(1);

  if (!account) {
    return error(c, 404, "AWS account not found");
  }

  if (account.status !== "active") {
    return error(c, 400, "AWS account is not active");
  }

  const credentials = await assumeRole(account.roleArn, account.externalId);
  const s3 = new S3Client({ region: "us-east-1", credentials });
  const result = await s3.send(new ListBucketsCommand({}));

  let allBuckets = (result.Buckets ?? []).map((b) => ({
    name: b.Name ?? "",
    creationDate: b.CreationDate?.toISOString() ?? "",
  }));

  if (cursor) {
    const idx = allBuckets.findIndex((b) => b.name === cursor);
    if (idx >= 0) {
      allBuckets = allBuckets.slice(idx + 1);
    }
  }

  const hasMore = allBuckets.length > limit;
  const items = allBuckets.slice(0, limit);

  return success(c, items, {
    nextCursor: hasMore ? (items.at(-1)?.name ?? null) : null,
    limit,
    total: (result.Buckets ?? []).length,
  });
}
