import {
  DeleteBucketCorsCommand,
  DeleteBucketLifecycleCommand,
  GetBucketCorsCommand,
  GetBucketLifecycleConfigurationCommand,
  GetBucketLocationCommand,
  GetPublicAccessBlockCommand,
  PutBucketCorsCommand,
  PutBucketLifecycleConfigurationCommand,
  PutBucketPolicyCommand,
  PutPublicAccessBlockCommand,
} from "@aws-sdk/client-s3";
import type { AwsCredentialIdentity } from "@smithy/types";
import { getS3Client } from "../s3";

export async function setBucketPublic(
  bucketName: string,
  region: string,
  credentials?: AwsCredentialIdentity
) {
  const client = getS3Client(region, credentials);

  await client.send(
    new PutPublicAccessBlockCommand({
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: false,
        BlockPublicPolicy: false,
        IgnorePublicAcls: false,
        RestrictPublicBuckets: false,
      },
    })
  );

  await client.send(
    new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "PublicReadGetObject",
            Effect: "Allow",
            Principal: "*",
            Action: "s3:GetObject",
            Resource: `arn:aws:s3:::${bucketName}/*`,
          },
        ],
      }),
    })
  );
}

export async function setBucketPrivate(
  bucketName: string,
  region: string,
  credentials?: AwsCredentialIdentity
) {
  const client = getS3Client(region, credentials);

  await client.send(
    new PutPublicAccessBlockCommand({
      Bucket: bucketName,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    })
  );

  await client.send(
    new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [],
      }),
    })
  );
}

export async function setBucketCors(
  bucketName: string,
  origins: string[],
  region: string,
  credentials?: AwsCredentialIdentity
) {
  const client = getS3Client(region, credentials);

  if (origins.length === 0) {
    try {
      await client.send(new DeleteBucketCorsCommand({ Bucket: bucketName }));
    } catch {
      // CORS config may not exist
    }
    return;
  }

  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: origins,
            AllowedMethods: ["GET", "HEAD"],
            AllowedHeaders: ["*"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    })
  );
}

export async function setBucketLifecycle(
  bucketName: string,
  ttlDays: number | null,
  region: string,
  credentials?: AwsCredentialIdentity
) {
  const client = getS3Client(region, credentials);

  if (ttlDays === null) {
    try {
      await client.send(
        new DeleteBucketLifecycleCommand({ Bucket: bucketName })
      );
    } catch {
      // Lifecycle config may not exist
    }
    return;
  }

  await client.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: bucketName,
      LifecycleConfiguration: {
        Rules: [
          {
            ID: "buckt-auto-expire",
            Status: "Enabled",
            Filter: { Prefix: "" },
            Expiration: { Days: ttlDays },
          },
        ],
      },
    })
  );
}

export async function readBucketSettings(
  bucketName: string,
  region: string,
  credentials?: AwsCredentialIdentity
) {
  const client = getS3Client(region, credentials);

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

export async function getBucketRegion(
  bucketName: string,
  credentials?: AwsCredentialIdentity
): Promise<string> {
  const client = getS3Client("us-east-1", credentials);
  const result = await client.send(
    new GetBucketLocationCommand({ Bucket: bucketName })
  );
  return result.LocationConstraint ?? "us-east-1";
}
