import { awsAccounts } from "@buckt/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { validateRole } from "../../lib/aws/sts";
import { db } from "../../lib/db";
import { error, success } from "../../utils/response";

export async function validateAwsAccount(c: Context) {
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

  if (!account.roleArn) {
    return error(c, 400, "Role ARN is required before validation");
  }

  const result = await validateRole(account.roleArn, account.externalId);

  if (result.valid) {
    const [updated] = await db
      .update(awsAccounts)
      .set({
        status: "active",
        lastValidatedAt: new Date(),
        awsAccountId: result.accountId ?? account.awsAccountId,
      })
      .where(eq(awsAccounts.id, id))
      .returning();

    return success(c, updated);
  }

  await db
    .update(awsAccounts)
    .set({ status: "failed" })
    .where(eq(awsAccounts.id, id));

  return error(c, 400, `Validation failed: ${result.error}`);
}
