import { buckets, createDb } from "@buckt/db";
import { logger, schedules } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { getCertificateStatus } from "../lib/aws/acm";
import { createDistribution } from "../lib/aws/cloudfront";

const db = createDb(process.env.DATABASE_URL ?? "");

const TIMEOUT_HOURS = 72;

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
        if (!bucket.acmCertArn) {
          continue;
        }

        const status = await getCertificateStatus(bucket.acmCertArn);
        logger.info("Cert status check", {
          bucketId: bucket.id,
          certArn: bucket.acmCertArn,
          status,
        });

        if (status === "ISSUED") {
          const websiteEndpoint = `${bucket.s3BucketName}.s3-website-${bucket.region}.amazonaws.com`;

          const { distributionId, distributionDomain } =
            await createDistribution({
              domain: bucket.customDomain,
              s3WebsiteEndpoint: websiteEndpoint,
              certArn: bucket.acmCertArn,
            });

          const dnsRecords = (
            (bucket.dnsRecords as Array<{
              name: string;
              type: string;
              value: string;
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

          logger.info("Bucket activated", {
            bucketId: bucket.id,
            distributionId,
          });
          continue;
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
      } catch (err) {
        console.error(`Failed to process bucket ${bucket.id}:`, err);
      }
    }
  },
});
