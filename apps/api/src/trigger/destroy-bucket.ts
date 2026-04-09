import { buckets, createDb } from "@buckt/db";
import { logger, task, wait } from "@trigger.dev/sdk/v3";
import { eq, sql } from "drizzle-orm";
import { deleteCertificate } from "../lib/aws/acm";
import { deleteDistribution, disableDistribution } from "../lib/aws/cloudfront";
import { deleteBucketResources } from "../lib/aws/s3";

const db = createDb(process.env.DATABASE_PUBLIC_URL ?? "");

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

    if (bucket.cloudfrontDistributionId) {
      try {
        logger.info("Disabling CloudFront distribution", {
          distributionId: bucket.cloudfrontDistributionId,
        });
        await disableDistribution(bucket.cloudfrontDistributionId);
        await wait.for({ minutes: 15 });
        await deleteDistribution(bucket.cloudfrontDistributionId);
        logger.info("CloudFront distribution deleted");
      } catch (err) {
        if (!(err instanceof Error && err.name === "NoSuchDistribution")) {
          throw err;
        }
      }
    }

    if (bucket.acmCertArn) {
      try {
        logger.info("Deleting ACM certificate", { certArn: bucket.acmCertArn });
        await deleteCertificate(bucket.acmCertArn);
      } catch (err) {
        if (
          !(err instanceof Error && err.name === "ResourceNotFoundException")
        ) {
          throw err;
        }
      }
    }

    try {
      logger.info("Deleting S3 bucket", { s3BucketName: bucket.s3BucketName });
      await deleteBucketResources(bucket.s3BucketName);
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
