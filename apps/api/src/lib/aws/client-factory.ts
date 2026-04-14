import { awsAccounts, createDb } from "@buckt/db";
import type { AwsCredentialIdentity } from "@smithy/types";
import { eq } from "drizzle-orm";
import { assumeRole } from "./sts";

export async function resolveCredentials(
  awsAccountId: string | null | undefined,
  db?: ReturnType<typeof createDb>
): Promise<AwsCredentialIdentity | undefined> {
  if (!awsAccountId) {
    return undefined;
  }

  const dbInstance =
    db ??
    createDb(process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL ?? "");
  const [account] = await dbInstance
    .select({
      roleArn: awsAccounts.roleArn,
      externalId: awsAccounts.externalId,
    })
    .from(awsAccounts)
    .where(eq(awsAccounts.id, awsAccountId))
    .limit(1);

  if (!account) {
    throw new Error(`AWS account ${awsAccountId} not found`);
  }

  if (!account.roleArn) {
    throw new Error(`AWS account ${awsAccountId} has no role ARN configured`);
  }

  return assumeRole(account.roleArn, account.externalId);
}
