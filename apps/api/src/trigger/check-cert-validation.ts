import { buckets, createDb } from "@buckt/db";
import type { AwsCredentialIdentity } from "@smithy/types";
import { logger, schedules } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { env } from "../env";
import { getCertificateStatus } from "../lib/aws/acm";
import { resolveCredentials } from "../lib/aws/client-factory";
import { createDistribution } from "../lib/aws/cloudfront";
import { upsertManagedAlias } from "../lib/aws/route53";

const db = createDb(process.env.DATABASE_PUBLIC_URL ?? "");

const TIMEOUT_HOURS = 72;

type BucketRow = typeof buckets.$inferSelect;

interface DnsRecord {
  applied?: boolean;
  name: string;
  type: string;
  value: string;
}

async function ensureDistribution(
  bucket: BucketRow,
  existingRecords: DnsRecord[],
  credentials?: AwsCredentialIdentity
): Promise<{ distributionId: string; distributionDomain: string }> {
  if (bucket.cloudfrontDistributionId) {
    const aliasRecord = existingRecords.find(
      (r) =>
        r.type === "A" &&
        r.name === bucket.customDomain &&
        r.value !== "pending-cloudfront-distribution"
    );
    if (!aliasRecord) {
      throw new Error(
        `Bucket ${bucket.id} has cloudfrontDistributionId but no resolved A record`
      );
    }
    return {
      distributionId: bucket.cloudfrontDistributionId,
      distributionDomain: aliasRecord.value,
    };
  }

  if (!bucket.acmCertArn) {
    throw new Error(`Bucket ${bucket.id} is missing acmCertArn`);
  }

  const websiteEndpoint = `${bucket.s3BucketName}.s3-website-${bucket.region}.amazonaws.com`;
  const created = await createDistribution({
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

  const dnsRecords = existingRecords.map((r) => {
    if (r.value !== "pending-cloudfront-distribution") {
      return r;
    }
    return bucket.isManagedDomain
      ? { ...r, value: created.distributionDomain, applied: true }
      : { ...r, value: created.distributionDomain };
  });

  await db
    .update(buckets)
    .set({
      cloudfrontDistributionId: created.distributionId,
      dnsRecords,
    })
    .where(eq(buckets.id, bucket.id));

  return created;
}

async function activateBucket(
  bucket: BucketRow,
  credentials?: AwsCredentialIdentity
): Promise<void> {
  const managedHostedZoneId = env.MANAGED_DOMAIN_HOSTED_ZONE_ID;
  if (bucket.isManagedDomain && !managedHostedZoneId) {
    throw new Error(
      "MANAGED_DOMAIN_HOSTED_ZONE_ID is not configured; cannot create Route53 record"
    );
  }

  const existingRecords = (bucket.dnsRecords as DnsRecord[] | null) ?? [];
  const { distributionId, distributionDomain } = await ensureDistribution(
    bucket,
    existingRecords,
    credentials
  );

  if (bucket.isManagedDomain && managedHostedZoneId) {
    await upsertManagedAlias({
      hostedZoneId: managedHostedZoneId,
      recordName: bucket.customDomain,
      distributionDomain,
    });
    logger.info("Managed domain Route53 alias created", {
      domain: bucket.customDomain,
      distributionDomain,
    });
  }

  await db
    .update(buckets)
    .set({ status: "active" })
    .where(eq(buckets.id, bucket.id));

  logger.info("Bucket activated", { bucketId: bucket.id, distributionId });
}

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
    await activateBucket(bucket, credentials);
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
