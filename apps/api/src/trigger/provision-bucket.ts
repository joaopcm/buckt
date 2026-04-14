import { buckets, createDb } from "@buckt/db";
import { logger, task } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { requestCertificate } from "../lib/aws/acm";
import { setBucketCors, setBucketLifecycle } from "../lib/aws/bucket-settings";
import { resolveCredentials } from "../lib/aws/client-factory";
import { createBucketResources } from "../lib/aws/s3";

const db = createDb(process.env.DATABASE_PUBLIC_URL ?? "");

export const provisionBucket = task({
  id: "provision-bucket",
  run: async ({ bucketId }: { bucketId: string }) => {
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

    const credentials = await resolveCredentials(bucket.awsAccountId, db);

    logger.info("Creating S3 bucket", { s3BucketName: bucket.s3BucketName });
    const { websiteEndpoint } = await createBucketResources(
      bucket.s3BucketName,
      bucket.region,
      bucket.visibility,
      credentials
    );

    if (bucket.corsOrigins.length > 0) {
      logger.info("Setting CORS", { origins: bucket.corsOrigins });
      await setBucketCors(
        bucket.s3BucketName,
        bucket.corsOrigins,
        bucket.region,
        credentials
      );
    }

    if (bucket.lifecycleTtlDays !== null) {
      logger.info("Setting lifecycle", { ttlDays: bucket.lifecycleTtlDays });
      await setBucketLifecycle(
        bucket.s3BucketName,
        bucket.lifecycleTtlDays,
        bucket.region,
        credentials
      );
    }

    logger.info("Requesting ACM certificate", { domain: bucket.customDomain });
    const { certArn, validationRecords } = await requestCertificate(
      bucket.customDomain,
      credentials
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
