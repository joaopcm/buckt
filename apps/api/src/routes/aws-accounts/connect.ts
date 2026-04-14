import { awsAccounts } from "@buckt/db";
import { connectAwsAccountSchema } from "@buckt/shared";
import type { Context } from "hono";
import { db } from "../../lib/db";
import { error } from "../../utils/response";

export async function connectAwsAccount(c: Context) {
  const body = await c.req.json();
  const parsed = connectAwsAccountSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 400, parsed.error.issues[0].message);
  }

  const orgId = c.get("orgId");
  const plan = c.get("plan") as string;

  if (plan === "free") {
    return error(c, 402, "BYOA requires a paid plan. Upgrade to enable.");
  }

  const externalId = crypto.randomUUID();
  const pendingAccountId = `pending-${crypto.randomUUID().slice(0, 8)}`;

  const [account] = await db
    .insert(awsAccounts)
    .values({
      orgId,
      awsAccountId: pendingAccountId,
      externalId,
      label: parsed.data.label,
      status: "pending",
    })
    .returning();

  return c.json({ data: account, error: null, meta: null }, 201);
}
