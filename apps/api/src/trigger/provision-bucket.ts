import { task, logger } from "@trigger.dev/sdk/v3"
import { eq } from "drizzle-orm"
import { createDb, buckets } from "@buckt/db"
import { createBucketResources } from "../lib/aws/s3"
import { requestCertificate } from "../lib/aws/acm"

const db = createDb(process.env.DATABASE_URL!)

export const provisionBucket = task({
  id: "provision-bucket",
  run: async ({ bucketId }: { bucketId: string }) => {
    const [bucket] = await db
      .select()
      .from(buckets)
      .where(eq(buckets.id, bucketId))
      .limit(1)

    if (!bucket) throw new Error(`Bucket ${bucketId} not found`)

    await db
      .update(buckets)
      .set({ status: "provisioning" })
      .where(eq(buckets.id, bucketId))

    logger.info("Creating S3 bucket", { s3BucketName: bucket.s3BucketName })
    const { websiteEndpoint } = await createBucketResources(bucket.s3BucketName)

    logger.info("Requesting ACM certificate", { domain: bucket.customDomain })
    const { certArn, validationRecords } = await requestCertificate(
      bucket.customDomain
    )

    const dnsRecords = [
      ...validationRecords,
      {
        name: bucket.customDomain,
        type: "CNAME",
        value: "pending-cloudfront-distribution",
      },
    ]

    await db
      .update(buckets)
      .set({
        acmCertArn: certArn,
        dnsRecords,
      })
      .where(eq(buckets.id, bucketId))

    logger.info("Provisioning started, waiting for cert validation", {
      certArn,
      websiteEndpoint,
    })

    return { certArn, websiteEndpoint, dnsRecords }
  },
})
