import { schedules } from "@trigger.dev/sdk/v3"
import { eq } from "drizzle-orm"
import {
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3"
import { createDb, buckets, subscription } from "@buckt/db"
import Stripe from "stripe"
import { s3 } from "../lib/s3"

const db = createDb(process.env.DATABASE_URL!)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export const aggregateBandwidth = schedules.task({
  id: "aggregate-bandwidth",
  cron: "0 3 * * *",
  run: async () => {
    const logBucket = process.env.CLOUDFRONT_LOG_BUCKET
    const logPrefix = process.env.CLOUDFRONT_LOG_PREFIX ?? "cf-logs/"
    if (!logBucket) return

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateStr = yesterday.toISOString().slice(0, 10)

    const distributionBandwidth = new Map<string, number>()

    let continuationToken: string | undefined
    do {
      const list = await s3.send(
        new ListObjectsV2Command({
          Bucket: logBucket,
          Prefix: logPrefix,
          ContinuationToken: continuationToken,
        })
      )

      for (const obj of list.Contents ?? []) {
        if (!obj.Key) continue
        const fileName = obj.Key.replace(logPrefix, "")
        const distId = fileName.split(".")[0]
        if (!fileName.includes(dateStr)) continue

        const response = await s3.send(
          new GetObjectCommand({ Bucket: logBucket, Key: obj.Key })
        )
        const body = await response.Body?.transformToString()
        if (!body) continue

        let totalBytes = 0
        for (const line of body.split("\n")) {
          if (line.startsWith("#") || !line.trim()) continue
          const fields = line.split("\t")
          if (fields.length < 4) continue
          totalBytes += Number.parseInt(fields[3], 10) || 0
        }

        distributionBandwidth.set(
          distId,
          (distributionBandwidth.get(distId) ?? 0) + totalBytes
        )
      }

      continuationToken = list.IsTruncated
        ? list.NextContinuationToken
        : undefined
    } while (continuationToken)

    const activeBuckets = await db
      .select()
      .from(buckets)
      .where(eq(buckets.status, "active"))
    const orgBandwidth = new Map<string, number>()

    for (const bucket of activeBuckets) {
      if (!bucket.cloudfrontDistributionId) continue
      const bytes =
        distributionBandwidth.get(bucket.cloudfrontDistributionId) ?? 0
      const newTotal = (bucket.bandwidthUsedBytes ?? 0) + bytes

      await db
        .update(buckets)
        .set({ bandwidthUsedBytes: newTotal })
        .where(eq(buckets.id, bucket.id))
      orgBandwidth.set(
        bucket.orgId,
        (orgBandwidth.get(bucket.orgId) ?? 0) + newTotal
      )
    }

    const meterEventName = process.env.STRIPE_METERED_BANDWIDTH_PRICE_ID
    if (!meterEventName) return

    for (const [orgId, totalBytes] of orgBandwidth) {
      try {
        const [sub] = await db
          .select()
          .from(subscription)
          .where(eq(subscription.referenceId, orgId))
          .limit(1)
        if (!sub?.stripeCustomerId) continue

        const bandwidthGb = Math.ceil(totalBytes / (1024 * 1024 * 1024))
        await stripe.billing.meterEvents.create({
          event_name: meterEventName,
          payload: {
            stripe_customer_id: sub.stripeCustomerId,
            value: String(bandwidthGb),
          },
        })
      } catch (err) {
        console.error(
          `Failed to report bandwidth for org ${orgId}:`,
          err
        )
      }
    }
  },
})
