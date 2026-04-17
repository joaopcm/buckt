"use server";

import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts";

interface AwsCredentialIdentity {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

const stsClient = new STSClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
  },
});

export async function validateRole(
  roleArn: string,
  externalId: string
): Promise<{ valid: boolean; accountId?: string; error?: string }> {
  try {
    const result = await stsClient.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: "buckt-validation",
        ExternalId: externalId,
        DurationSeconds: 900,
      })
    );
    const accountId = result.AssumedRoleUser?.Arn?.split(":")[4];
    return { valid: true, accountId };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function assumeRole(
  roleArn: string,
  externalId: string
): Promise<AwsCredentialIdentity> {
  const result = await stsClient.send(
    new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: `buckt-${Date.now()}`,
      ExternalId: externalId,
      DurationSeconds: 3600,
    })
  );

  const creds = result.Credentials;
  if (!(creds?.AccessKeyId && creds.SecretAccessKey && creds.SessionToken)) {
    throw new Error("STS AssumeRole did not return valid credentials");
  }

  return {
    accessKeyId: creds.AccessKeyId,
    secretAccessKey: creds.SecretAccessKey,
    sessionToken: creds.SessionToken,
  };
}
