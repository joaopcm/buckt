"use server";

import {
  DeleteBucketCorsCommand,
  DeleteBucketLifecycleCommand,
  DeleteBucketPolicyCommand,
  PutBucketCorsCommand,
  PutBucketLifecycleConfigurationCommand,
  PutBucketPolicyCommand,
  PutPublicAccessBlockCommand,
  S3Client,
} from "@aws-sdk/client-s3";

interface AwsCredentialIdentity {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

export async function setBucketPublic(
  bucketName: string,
  region: string,
  credentials?: AwsCredentialIdentity
) {
  const client = new S3Client({ region, credentials });

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
  const client = new S3Client({ region, credentials });

  try {
    await client.send(new DeleteBucketPolicyCommand({ Bucket: bucketName }));
  } catch {
    // bucket policy may not exist
  }

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
}

export async function setBucketCors(
  bucketName: string,
  origins: string[],
  region: string,
  credentials?: AwsCredentialIdentity
) {
  const client = new S3Client({ region, credentials });

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
  const client = new S3Client({ region, credentials });

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
