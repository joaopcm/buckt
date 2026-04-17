import { buckets, createDb } from "@buckt/db";
import { logger, task } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { env } from "../env";
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

    let certArn: string;
    let dnsRecords: Array<{ name: string; type: string; value: string }>;

    if (bucket.isManagedDomain) {
      if (!env.MANAGED_DOMAIN_CERT_ARN) {
        throw new Error(
          "MANAGED_DOMAIN_CERT_ARN is not configured; cannot provision managed-domain buckets"
        );
      }
      certArn = env.MANAGED_DOMAIN_CERT_ARN;
      dnsRecords = [
        {
          name: bucket.customDomain,
          type: "A",
          value: "pending-cloudfront-distribution",
        },
      ];
      logger.info("Using shared wildcard cert for managed domain", {
        domain: bucket.customDomain,
        certArn,
      });
    } else {
      logger.info("Requesting ACM certificate", {
        domain: bucket.customDomain,
      });
      const result = await requestCertificate(bucket.customDomain, credentials);
      certArn = result.certArn;
      dnsRecords = [
        ...result.validationRecords,
        {
          name: bucket.customDomain,
          type: "CNAME",
          value: "pending-cloudfront-distribution",
        },
      ];
    }

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
