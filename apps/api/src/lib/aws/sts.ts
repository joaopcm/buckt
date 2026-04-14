import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts";
import type { AwsCredentialIdentity } from "@smithy/types";
import { env } from "../../env";

const stsClient = new STSClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

interface CachedCredentials {
  credentials: AwsCredentialIdentity;
  expiresAt: number;
}

const credentialCache = new Map<string, CachedCredentials>();

const CACHE_MARGIN_MS = 10 * 60 * 1000;

export async function assumeRole(
  roleArn: string,
  externalId: string
): Promise<AwsCredentialIdentity> {
  const cacheKey = roleArn;
  const cached = credentialCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.credentials;
  }

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

  const credentials: AwsCredentialIdentity = {
    accessKeyId: creds.AccessKeyId,
    secretAccessKey: creds.SecretAccessKey,
    sessionToken: creds.SessionToken,
  };

  const expiresAt = creds.Expiration
    ? creds.Expiration.getTime() - CACHE_MARGIN_MS
    : Date.now() + 50 * 60 * 1000;

  credentialCache.set(cacheKey, { credentials, expiresAt });

  return credentials;
}

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
