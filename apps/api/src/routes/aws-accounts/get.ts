import { awsAccounts } from "@buckt/db";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { db } from "../../lib/db";
import { error, success } from "../../utils/response";

export async function getAwsAccount(c: Context) {
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

  return success(c, account);
}
