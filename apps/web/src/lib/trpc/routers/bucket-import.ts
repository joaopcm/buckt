"use server";

import {
  GetBucketCorsCommand,
  GetBucketLifecycleConfigurationCommand,
  GetBucketLocationCommand,
  GetPublicAccessBlockCommand,
  S3Client,
} from "@aws-sdk/client-s3";

interface AwsCredentialIdentity {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export async function getBucketRegion(
  bucketName: string,
  credentials: AwsCredentialIdentity
): Promise<string> {
  const client = new S3Client({ region: "us-east-1", credentials });
  const result = await client.send(
    new GetBucketLocationCommand({ Bucket: bucketName })
  );
  return result.LocationConstraint ?? "us-east-1";
}

export async function readBucketSettings(
  bucketName: string,
  region: string,
  credentials: AwsCredentialIdentity
) {
  const client = new S3Client({ region, credentials });

  let visibility: "public" | "private" = "private";
  try {
    const block = await client.send(
      new GetPublicAccessBlockCommand({ Bucket: bucketName })
    );
    const cfg = block.PublicAccessBlockConfiguration;
    if (!(cfg?.BlockPublicAcls || cfg?.BlockPublicPolicy)) {
      visibility = "public";
    }
  } catch {
    visibility = "private";
  }

  let corsOrigins: string[] = [];
  try {
    const cors = await client.send(
      new GetBucketCorsCommand({ Bucket: bucketName })
    );
    corsOrigins = cors.CORSRules?.flatMap((r) => r.AllowedOrigins ?? []) ?? [];
  } catch {
    // no CORS config
  }

  let lifecycleTtlDays: number | null = null;
  try {
    const lifecycle = await client.send(
      new GetBucketLifecycleConfigurationCommand({ Bucket: bucketName })
    );
    const expireRule = lifecycle.Rules?.find(
      (r) => r.Status === "Enabled" && r.Expiration?.Days
    );
    if (expireRule?.Expiration?.Days) {
      lifecycleTtlDays = expireRule.Expiration.Days;
    }
  } catch {
    // no lifecycle config
  }

  return { visibility, corsOrigins, lifecycleTtlDays };
}
