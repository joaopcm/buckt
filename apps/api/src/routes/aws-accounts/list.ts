import { awsAccounts } from "@buckt/db";
import { listAwsAccountsSchema } from "@buckt/shared";
import { and, asc, count, eq, gt } from "drizzle-orm";
import type { Context } from "hono";
import { db } from "../../lib/db";
import { error, success } from "../../utils/response";

export async function listAwsAccounts(c: Context) {
  const orgId = c.get("orgId");
  const query = listAwsAccountsSchema.safeParse(c.req.query());
  if (!query.success) {
    return error(c, 400, query.error.issues[0].message);
  }

  const { cursor, limit } = query.data;
  const baseConditions = [eq(awsAccounts.orgId, orgId)];

  const conditions = [...baseConditions];
  if (cursor) {
    conditions.push(gt(awsAccounts.id, cursor));
  }

  const [items, [{ total }]] = await Promise.all([
    db
      .select()
      .from(awsAccounts)
      .where(and(...conditions))
      .orderBy(asc(awsAccounts.id))
      .limit(limit + 1),
    db
      .select({ total: count() })
      .from(awsAccounts)
      .where(and(...baseConditions)),
  ]);

  const hasMore = items.length > limit;
  if (hasMore) {
    items.pop();
  }

  const publicItems = items.map(
    ({ acmWebhookSecret: _secret, ...rest }) => rest
  );

  return success(c, publicItems, {
    nextCursor: hasMore ? (publicItems.at(-1)?.id ?? null) : null,
    limit,
    total,
  });
}
