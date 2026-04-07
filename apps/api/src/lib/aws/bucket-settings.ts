import {
  DeleteBucketCorsCommand,
  DeleteBucketLifecycleCommand,
  PutBucketCorsCommand,
  PutBucketLifecycleConfigurationCommand,
  PutBucketPolicyCommand,
  PutPublicAccessBlockCommand,
} from "@aws-sdk/client-s3";
import { s3 } from "../s3";

export async function setBucketPublic(bucketName: string) {
  await s3.send(
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

  await s3.send(
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

export async function setBucketPrivate(bucketName: string) {
  await s3.send(
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

  await s3.send(
    new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [],
      }),
    })
  );
}

export async function setBucketCors(bucketName: string, origins: string[]) {
  if (origins.length === 0) {
    try {
      await s3.send(new DeleteBucketCorsCommand({ Bucket: bucketName }));
    } catch {
      // CORS config may not exist
    }
    return;
  }

  await s3.send(
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
  ttlDays: number | null
) {
  if (ttlDays === null) {
    try {
      await s3.send(
        new DeleteBucketLifecycleCommand({ Bucket: bucketName })
      );
    } catch {
      // Lifecycle config may not exist
    }
    return;
  }

  await s3.send(
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
