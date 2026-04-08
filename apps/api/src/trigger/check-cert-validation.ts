import { buckets, createDb } from "@buckt/db";
import { applyCloudfrontCname } from "@buckt/domain-connect";
import { logger, schedules } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { getCertificateStatus } from "../lib/aws/acm";
import { createDistribution } from "../lib/aws/cloudfront";

const db = createDb(process.env.DATABASE_PUBLIC_URL ?? "");

const TIMEOUT_HOURS = 72;

type BucketRow = typeof buckets.$inferSelect;

async function tryApplyDomainConnectCname(
  bucket: BucketRow,
  distributionDomain: string
): Promise<boolean> {
  if (
    !(
      bucket.domainConnectProvider &&
      bucket.domainConnectAccessToken &&
      process.env.DOMAIN_CONNECT_TOKEN_ENCRYPTION_KEY &&
      process.env.DOMAIN_CONNECT_CLIENT_ID &&
      process.env.DOMAIN_CONNECT_CLIENT_SECRET
    )
  ) {
    return false;
  }

  try {
    const result = await applyCloudfrontCname(
      {
        domainConnectProvider: bucket.domainConnectProvider,
        domainConnectAccessToken: bucket.domainConnectAccessToken,
        domainConnectRefreshToken: bucket.domainConnectRefreshToken ?? "",
        domainConnectTokenExpiresAt: bucket.domainConnectTokenExpiresAt,
        customDomain: bucket.customDomain,
      },
      {
        encryptionKey: process.env.DOMAIN_CONNECT_TOKEN_ENCRYPTION_KEY,
        clientId: process.env.DOMAIN_CONNECT_CLIENT_ID,
        clientSecret: process.env.DOMAIN_CONNECT_CLIENT_SECRET,
        providerId: process.env.DOMAIN_CONNECT_PROVIDER_ID ?? "buckt.dev",
      },
      distributionDomain
    );

    if (result.applied) {
      logger.info("Domain Connect: CloudFront CNAME applied", {
        bucketId: bucket.id,
      });

      if (result.newAccessToken) {
        await db
          .update(buckets)
          .set({
            domainConnectAccessToken: result.newAccessToken,
            domainConnectRefreshToken: result.newRefreshToken,
            domainConnectTokenExpiresAt: result.newExpiresAt,
          })
          .where(eq(buckets.id, bucket.id));
      }
      return true;
    }
  } catch (err) {
    logger.warn(
      "Domain Connect: failed to apply CloudFront CNAME, falling back to manual",
      { bucketId: bucket.id, error: String(err) }
    );
  }

  return false;
}

async function processBucket(bucket: BucketRow): Promise<void> {
  if (!bucket.acmCertArn) {
    return;
  }

  const status = await getCertificateStatus(bucket.acmCertArn);
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
      logBucket: process.env.CLOUDFRONT_LOG_BUCKET,
      logPrefix: process.env.CLOUDFRONT_LOG_PREFIX,
    });

    const cnameApplied = await tryApplyDomainConnectCname(
      bucket,
      distributionDomain
    );

    const dnsRecords = (
      (bucket.dnsRecords as Array<{
        name: string;
        type: string;
        value: string;
        applied?: boolean;
      }>) ?? []
    ).map((r) =>
      r.value === "pending-cloudfront-distribution"
        ? {
            ...r,
            value: distributionDomain,
            applied: cnameApplied || undefined,
          }
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
        await processBucket(bucket);
      } catch (err) {
        console.error(`Failed to process bucket ${bucket.id}:`, err);
      }
    }
  },
});
