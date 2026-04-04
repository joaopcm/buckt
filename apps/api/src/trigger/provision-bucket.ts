import { GetCallerIdentityCommand, STSClient } from "@aws-sdk/client-sts";
import { buckets, createDb } from "@buckt/db";
import { logger, task } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { requestCertificate } from "../lib/aws/acm";
import { createBucketResources } from "../lib/aws/s3";

const db = createDb(process.env.DATABASE_PUBLIC_URL ?? "");

export const provisionBucket = task({
  id: "provision-bucket",
  run: async ({ bucketId }: { bucketId: string }) => {
    const sts = new STSClient({
      region: process.env.AWS_REGION ?? "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
      },
    });
    const identity = await sts.send(new GetCallerIdentityCommand({}));
    logger.info("AWS caller identity", {
      arn: identity.Arn,
      account: identity.Account,
      userId: identity.UserId,
      awsRegion: process.env.AWS_REGION,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
    });

    const [bucket] = await db
      .select()
      .from(buckets)
      .where(eq(buckets.id, bucketId))
      .limit(1);

    if (!bucket) {
      throw new Error(`Bucket ${bucketId} not found`);
    }

    await db
      .update(buckets)
      .set({ status: "provisioning" })
      .where(eq(buckets.id, bucketId));

    logger.info("Creating S3 bucket", { s3BucketName: bucket.s3BucketName });
    const { websiteEndpoint } = await createBucketResources(
      bucket.s3BucketName,
      bucket.region
    );

    logger.info("Requesting ACM certificate", { domain: bucket.customDomain });
    const { certArn, validationRecords } = await requestCertificate(
      bucket.customDomain
    );

    const dnsRecords = [
      ...validationRecords,
      {
        name: bucket.customDomain,
        type: "CNAME",
        value: "pending-cloudfront-distribution",
      },
    ];

    await db
      .update(buckets)
      .set({
        acmCertArn: certArn,
        dnsRecords,
      })
      .where(eq(buckets.id, bucketId));

    logger.info("Provisioning started, waiting for cert validation", {
      certArn,
      websiteEndpoint,
    });

    return { certArn, websiteEndpoint, dnsRecords };
  },
});
