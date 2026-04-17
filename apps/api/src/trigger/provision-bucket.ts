import { buckets, createDb } from "@buckt/db";
import { logger, task, wait } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { requestCertificate } from "../lib/aws/acm";
import { setBucketCors, setBucketLifecycle } from "../lib/aws/bucket-settings";
import { resolveCredentials } from "../lib/aws/client-factory";
import { createDistribution } from "../lib/aws/cloudfront";
import { createBucketResources } from "../lib/aws/s3";

const db = createDb(process.env.DATABASE_PUBLIC_URL ?? "");

const ACM_WAIT_TIMEOUT = "24h";

interface DnsRecord {
  applied?: boolean;
  name: string;
  type: string;
  value: string;
}

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

    const dnsRecords: DnsRecord[] = [
      ...validationRecords,
      {
        name: bucket.customDomain,
        type: "CNAME",
        value: "pending-cloudfront-distribution",
      },
    ];

    const token = await wait.createToken({ timeout: ACM_WAIT_TIMEOUT });

    await db
      .update(buckets)
      .set({
        acmCertArn: certArn,
        acmWaitTokenId: token.id,
        dnsRecords,
      })
      .where(eq(buckets.id, bucketId));

    logger.info("Waiting for ACM certificate to be issued", {
      certArn,
      tokenId: token.id,
    });

    const result = await wait.forToken<{ ok: true }>(token.id);

    if (!result.ok) {
      logger.warn("ACM wait token timed out, marking bucket failed", {
        bucketId,
        certArn,
      });
      await db
        .update(buckets)
        .set({ status: "failed" })
        .where(eq(buckets.id, bucketId));
      return;
    }

    logger.info("Creating CloudFront distribution", { certArn });
    try {
      const { distributionId, distributionDomain } = await createDistribution({
        domain: bucket.customDomain,
        s3WebsiteEndpoint: websiteEndpoint,
        certArn,
        logBucket: bucket.awsAccountId
          ? undefined
          : process.env.CLOUDFRONT_LOG_BUCKET,
        logPrefix: bucket.awsAccountId
          ? undefined
          : process.env.CLOUDFRONT_LOG_PREFIX,
        credentials,
      });

      const finalDnsRecords = dnsRecords.map((r) =>
        r.value === "pending-cloudfront-distribution"
          ? { ...r, value: distributionDomain }
          : r
      );

      await db
        .update(buckets)
        .set({
          status: "active",
          cloudfrontDistributionId: distributionId,
          dnsRecords: finalDnsRecords,
        })
        .where(eq(buckets.id, bucketId));

      logger.info("Bucket activated", { bucketId, distributionId });
    } catch (err) {
      logger.error("Failed to finalize bucket after cert issuance", {
        bucketId,
        certArn,
        err,
      });
      await db
        .update(buckets)
        .set({ status: "failed" })
        .where(eq(buckets.id, bucketId));
      throw err;
    }
  },
});
