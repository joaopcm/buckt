import { buckets, createDb } from "@buckt/db";
import { applyAcmValidationRecords } from "@buckt/domain-connect";
import { logger, task } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { requestCertificate } from "../lib/aws/acm";
import { setBucketCors, setBucketLifecycle } from "../lib/aws/bucket-settings";
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

    logger.info("Creating S3 bucket", { s3BucketName: bucket.s3BucketName });
    const { websiteEndpoint } = await createBucketResources(
      bucket.s3BucketName,
      bucket.region,
      bucket.visibility
    );

    if (bucket.corsOrigins.length > 0) {
      logger.info("Setting CORS", { origins: bucket.corsOrigins });
      await setBucketCors(bucket.s3BucketName, bucket.corsOrigins);
    }

    if (bucket.lifecycleTtlDays !== null) {
      logger.info("Setting lifecycle", { ttlDays: bucket.lifecycleTtlDays });
      await setBucketLifecycle(bucket.s3BucketName, bucket.lifecycleTtlDays);
    }

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

    let appliedRecords = false;

    if (
      bucket.domainConnectProvider &&
      bucket.domainConnectAccessToken &&
      process.env.DOMAIN_CONNECT_TOKEN_ENCRYPTION_KEY &&
      process.env.DOMAIN_CONNECT_CLIENT_ID &&
      process.env.DOMAIN_CONNECT_CLIENT_SECRET
    ) {
      try {
        const result = await applyAcmValidationRecords(
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
          validationRecords
        );

        if (result.applied) {
          appliedRecords = true;
          logger.info("Domain Connect: ACM validation records applied");

          if (result.newAccessToken) {
            await db
              .update(buckets)
              .set({
                domainConnectAccessToken: result.newAccessToken,
                domainConnectRefreshToken: result.newRefreshToken,
                domainConnectTokenExpiresAt: result.newExpiresAt,
              })
              .where(eq(buckets.id, bucketId));
          }
        }
      } catch (err) {
        logger.warn(
          "Domain Connect: failed to apply ACM records, falling back to manual",
          {
            error: String(err),
          }
        );
      }
    }

    const finalDnsRecords = appliedRecords
      ? dnsRecords.map((r) =>
          r.value === "pending-cloudfront-distribution"
            ? r
            : { ...r, applied: true }
        )
      : dnsRecords;

    await db
      .update(buckets)
      .set({
        acmCertArn: certArn,
        dnsRecords: finalDnsRecords,
      })
      .where(eq(buckets.id, bucketId));

    logger.info("Provisioning started, waiting for cert validation", {
      certArn,
      websiteEndpoint,
    });

    return { certArn, websiteEndpoint, dnsRecords: finalDnsRecords };
  },
});
