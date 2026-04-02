import { task, wait, logger } from "@trigger.dev/sdk/v3"
import { eq } from "drizzle-orm"
import { createDb, buckets } from "@buckt/db"
import { deleteBucketResources } from "../lib/aws/s3"
import { deleteCertificate } from "../lib/aws/acm"
import {
  disableDistribution,
  deleteDistribution,
} from "../lib/aws/cloudfront"

const db = createDb(process.env.DATABASE_URL!)

export const destroyBucket = task({
  id: "destroy-bucket",
  run: async ({ bucketId }: { bucketId: string }) => {
    const [bucket] = await db
      .select()
      .from(buckets)
      .where(eq(buckets.id, bucketId))
      .limit(1)

    if (!bucket) throw new Error(`Bucket ${bucketId} not found`)

    if (bucket.cloudfrontDistributionId) {
      logger.info("Disabling CloudFront distribution", {
        distributionId: bucket.cloudfrontDistributionId,
      })
      await disableDistribution(bucket.cloudfrontDistributionId)
      await wait.for({ minutes: 15 })
      await deleteDistribution(bucket.cloudfrontDistributionId)
      logger.info("CloudFront distribution deleted")
    }

    if (bucket.acmCertArn) {
      logger.info("Deleting ACM certificate", { certArn: bucket.acmCertArn })
      await deleteCertificate(bucket.acmCertArn)
    }

    logger.info("Deleting S3 bucket", { s3BucketName: bucket.s3BucketName })
    await deleteBucketResources(bucket.s3BucketName)

    await db.delete(buckets).where(eq(buckets.id, bucketId))
    logger.info("Bucket destroyed", { bucketId })
  },
})
