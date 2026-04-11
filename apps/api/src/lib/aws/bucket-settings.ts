import {
  DeleteBucketCorsCommand,
  DeleteBucketLifecycleCommand,
  PutBucketCorsCommand,
  PutBucketLifecycleConfigurationCommand,
  PutBucketPolicyCommand,
  PutPublicAccessBlockCommand,
} from "@aws-sdk/client-s3";
import { getS3Client } from "../s3";

export async function setBucketPublic(bucketName: string, region: string) {
  const client = getS3Client(region);

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

export async function setBucketPrivate(bucketName: string, region: string) {
  const client = getS3Client(region);

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
  region: string
) {
  const client = getS3Client(region);

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
  region: string
) {
  const client = getS3Client(region);

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
