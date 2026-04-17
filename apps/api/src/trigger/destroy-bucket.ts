import { buckets, createDb } from "@buckt/db";
import type { AwsCredentialIdentity } from "@smithy/types";
import { logger, task, wait } from "@trigger.dev/sdk/v3";
import { eq, sql } from "drizzle-orm";
import { env } from "../env";
import { deleteCertificate } from "../lib/aws/acm";
import { resolveCredentials } from "../lib/aws/client-factory";
import { deleteDistribution, disableDistribution } from "../lib/aws/cloudfront";
import { deleteManagedAlias } from "../lib/aws/route53";
import { deleteBucketResources } from "../lib/aws/s3";

const db = createDb(process.env.DATABASE_PUBLIC_URL ?? "");

type BucketRow = typeof buckets.$inferSelect;

function extractDistributionDomain(bucket: BucketRow): string | undefined {
  const records =
    (bucket.dnsRecords as Array<{
      name: string;
      type: string;
      value: string;
    }>) ?? [];
  const aliasRecord = records.find(
    (r) => r.name === bucket.customDomain && r.type === "A"
  );
  if (!aliasRecord || aliasRecord.value === "pending-cloudfront-distribution") {
    return;
  }
  return aliasRecord.value;
}

async function tearDownDistribution(
  distributionId: string,
  credentials: AwsCredentialIdentity | undefined
) {
  try {
    logger.info("Disabling CloudFront distribution", { distributionId });
    await disableDistribution(distributionId, credentials);
    await wait.for({ minutes: 15 });
    await deleteDistribution(distributionId, credentials);
    logger.info("CloudFront distribution deleted");
  } catch (err) {
    if (!(err instanceof Error && err.name === "NoSuchDistribution")) {
      throw err;
    }
  }
}

async function tearDownCertificate(
  certArn: string,
  credentials: AwsCredentialIdentity | undefined
) {
  try {
    logger.info("Deleting ACM certificate", { certArn });
    await deleteCertificate(certArn, credentials);
  } catch (err) {
    if (!(err instanceof Error && err.name === "ResourceNotFoundException")) {
      throw err;
    }
  }
}

async function tearDownManagedAlias(bucket: BucketRow) {
  const distributionDomain = extractDistributionDomain(bucket);
  if (!distributionDomain) {
    logger.info("No Route53 alias to delete; distribution never attached", {
      bucketId: bucket.id,
    });
    return;
  }
  if (!env.MANAGED_DOMAIN_HOSTED_ZONE_ID) {
    throw new Error(
      "MANAGED_DOMAIN_HOSTED_ZONE_ID is not configured; cannot delete Route53 record"
    );
  }
  logger.info("Deleting Route53 alias for managed domain", {
    domain: bucket.customDomain,
  });
  await deleteManagedAlias({
    hostedZoneId: env.MANAGED_DOMAIN_HOSTED_ZONE_ID,
    recordName: bucket.customDomain,
    distributionDomain,
  });
}

export const destroyBucket = task({
  id: "destroy-bucket",
  run: async ({ bucketId }: { bucketId: string }) => {
    const [bucket] = await db
      .select()
      .from(buckets)
      .where(eq(buckets.id, bucketId))
      .limit(1);

    if (!bucket) {
      throw new Error(`Bucket ${bucketId} not found`);
    }

    const credentials = await resolveCredentials(bucket.awsAccountId, db);

    if (bucket.cloudfrontDistributionId) {
      await tearDownDistribution(bucket.cloudfrontDistributionId, credentials);
    }

    if (bucket.isManagedDomain) {
      await tearDownManagedAlias(bucket);
    } else if (bucket.acmCertArn) {
      await tearDownCertificate(bucket.acmCertArn, credentials);
    }

    try {
      logger.info("Deleting S3 bucket", { s3BucketName: bucket.s3BucketName });
      await deleteBucketResources(
        bucket.s3BucketName,
        bucket.region,
        credentials
      );
    } catch (err) {
      if (!(err instanceof Error && err.name === "NoSuchBucket")) {
        throw err;
      }
    }

    await db.delete(buckets).where(eq(buckets.id, bucketId));

    await db.execute(sql`
      UPDATE api_keys
      SET bucket_ids = COALESCE(
        (SELECT jsonb_agg(elem)
         FROM jsonb_array_elements(bucket_ids) AS elem
         WHERE elem::text != ${JSON.stringify(bucketId)}),
        '[]'::jsonb
      )
      WHERE bucket_ids IS NOT NULL
        AND bucket_ids @> ${JSON.stringify([bucketId])}::jsonb
    `);

    logger.info("Bucket destroyed", { bucketId });
  },
});
