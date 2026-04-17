import { awsAccounts } from "@buckt/db";
import { updateAwsAccountSchema } from "@buckt/shared";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { db } from "../../lib/db";
import { error, success } from "../../utils/response";

export async function updateAwsAccount(c: Context) {
  const orgId = c.get("orgId");
  const id = c.req.param("id") as string;
  const body = await c.req.json();
  const parsed = updateAwsAccountSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 400, parsed.error.issues[0].message);
  }

  const [account] = await db
    .select()
    .from(awsAccounts)
    .where(and(eq(awsAccounts.id, id), eq(awsAccounts.orgId, orgId)))
    .limit(1);

  if (!account) {
    return error(c, 404, "AWS account not found");
  }

  const [updated] = await db
    .update(awsAccounts)
    .set(parsed.data)
    .where(eq(awsAccounts.id, id))
    .returning();

  const { acmWebhookSecret: _secret, ...publicAccount } = updated;
  return success(c, publicAccount);
}
