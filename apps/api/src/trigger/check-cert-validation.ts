import { buckets, createDb } from "@buckt/db";
import type { AwsCredentialIdentity } from "@smithy/types";
import { logger, schedules } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { getCertificateStatus } from "../lib/aws/acm";
import { resolveCredentials } from "../lib/aws/client-factory";
import { createDistribution } from "../lib/aws/cloudfront";

const db = createDb(process.env.DATABASE_PUBLIC_URL ?? "");

const TIMEOUT_HOURS = 72;

type BucketRow = typeof buckets.$inferSelect;

async function processBucket(
  bucket: BucketRow,
  credentials?: AwsCredentialIdentity
): Promise<void> {
  if (!bucket.acmCertArn) {
    return;
  }

  const status = await getCertificateStatus(bucket.acmCertArn, credentials);
  logger.info("Cert status check", {
    bucketId: bucket.id,
    certArn: bucket.acmCertArn,
    status,
  });

  if (status === "ISSUED") {
    const websiteEndpoint = `${bucket.s3BucketName}.s3-website-${bucket.region}.amazonaws.com`;

    const { distributionId, distributionDomain } = await createDistribution({
      domain: bucket.customDomain,
      s3WebsiteEndpoint: websiteEndpoint,
      certArn: bucket.acmCertArn,
      logBucket: bucket.awsAccountId
        ? undefined
        : process.env.CLOUDFRONT_LOG_BUCKET,
      logPrefix: bucket.awsAccountId
        ? undefined
        : process.env.CLOUDFRONT_LOG_PREFIX,
      credentials,
    });

    const dnsRecords = (
      (bucket.dnsRecords as Array<{
        name: string;
        type: string;
        value: string;
        applied?: boolean;
      }>) ?? []
    ).map((r) =>
      r.value === "pending-cloudfront-distribution"
        ? { ...r, value: distributionDomain }
        : r
    );

    await db
      .update(buckets)
      .set({
        status: "active",
        cloudfrontDistributionId: distributionId,
        dnsRecords,
      })
      .where(eq(buckets.id, bucket.id));

    logger.info("Bucket activated", { bucketId: bucket.id, distributionId });
    return;
  }

  const hoursSinceCreation =
    (Date.now() - bucket.createdAt.getTime()) / (1000 * 60 * 60);

  if (status === "FAILED" || hoursSinceCreation > TIMEOUT_HOURS) {
    await db
      .update(buckets)
      .set({ status: "failed" })
      .where(eq(buckets.id, bucket.id));
    logger.warn("Bucket provisioning failed", {
      bucketId: bucket.id,
      reason: status === "FAILED" ? "cert_failed" : "timeout",
    });
  }
}

export const checkCertValidation = schedules.task({
  id: "check-cert-validation",
  cron: "*/5 * * * *",
  run: async () => {
    const pendingBuckets = await db
      .select()
      .from(buckets)
      .where(eq(buckets.status, "provisioning"));

    for (const bucket of pendingBuckets) {
      try {
        const credentials = await resolveCredentials(bucket.awsAccountId, db);
        await processBucket(bucket, credentials);
      } catch (err) {
        console.error(`Failed to process bucket ${bucket.id}:`, err);
      }
    }
  },
});
