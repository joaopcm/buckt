import { buckets, createDb } from "@buckt/db";
import { logger, task, wait } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { env } from "../env";
import { requestCertificate } from "../lib/aws/acm";
import { setBucketCors, setBucketLifecycle } from "../lib/aws/bucket-settings";
import { resolveCredentials } from "../lib/aws/client-factory";
import { createDistribution } from "../lib/aws/cloudfront";
import { upsertManagedAlias } from "../lib/aws/route53";
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

    if (bucket.isManagedDomain && !env.MANAGED_DOMAIN_CERT_ARN) {
      throw new Error(
        "MANAGED_DOMAIN_CERT_ARN is not configured; cannot provision managed-domain buckets"
      );
    }
    if (bucket.isManagedDomain && !env.MANAGED_DOMAIN_HOSTED_ZONE_ID) {
      throw new Error(
        "MANAGED_DOMAIN_HOSTED_ZONE_ID is not configured; cannot create Route53 record"
      );
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
    let dnsRecords: DnsRecord[];

    if (bucket.isManagedDomain) {
      certArn = env.MANAGED_DOMAIN_CERT_ARN as string;
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

      await db
        .update(buckets)
        .set({ acmCertArn: certArn, dnsRecords })
        .where(eq(buckets.id, bucketId));
    } else {
      logger.info("Requesting ACM certificate", {
        domain: bucket.customDomain,
      });
      const { certArn: requestedCertArn, validationRecords } =
        await requestCertificate(bucket.customDomain, credentials);
      certArn = requestedCertArn;
      dnsRecords = [
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

      const finalDnsRecords = dnsRecords.map((r) => {
        if (r.value !== "pending-cloudfront-distribution") {
          return r;
        }
        return bucket.isManagedDomain
          ? { ...r, value: distributionDomain, applied: true }
          : { ...r, value: distributionDomain };
      });

      await db
        .update(buckets)
        .set({
          cloudfrontDistributionId: distributionId,
          dnsRecords: finalDnsRecords,
        })
        .where(eq(buckets.id, bucketId));

      if (bucket.isManagedDomain) {
        await upsertManagedAlias({
          hostedZoneId: env.MANAGED_DOMAIN_HOSTED_ZONE_ID as string,
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
