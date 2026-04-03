import { schedules } from "@trigger.dev/sdk/v3"
import { eq } from "drizzle-orm"
import { createDb, buckets, subscription } from "@buckt/db"
import { getBucketSizeBytes } from "../lib/aws/cloudwatch"
import Stripe from "stripe"

const db = createDb(process.env.DATABASE_URL!)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export const aggregateStorage = schedules.task({
  id: "aggregate-storage",
  cron: "0 2 * * *",
  run: async () => {
    const activeBuckets = await db
      .select()
      .from(buckets)
      .where(eq(buckets.status, "active"))
    const orgStorage = new Map<string, number>()

    for (const bucket of activeBuckets) {
      try {
        const sizeBytes = await getBucketSizeBytes(bucket.s3BucketName)
        await db
          .update(buckets)
          .set({ storageUsedBytes: sizeBytes })
          .where(eq(buckets.id, bucket.id))
        orgStorage.set(
          bucket.orgId,
          (orgStorage.get(bucket.orgId) ?? 0) + sizeBytes
        )
      } catch (err) {
        console.error(
          `Failed to get metrics for bucket ${bucket.id}:`,
          err
        )
      }
    }

    const meteredPriceId = process.env.STRIPE_METERED_STORAGE_PRICE_ID
    if (!meteredPriceId) return

    for (const [orgId, totalBytes] of orgStorage) {
      try {
        const [sub] = await db
          .select()
          .from(subscription)
          .where(eq(subscription.referenceId, orgId))
          .limit(1)
        if (!sub?.stripeSubscriptionId) continue

        const items = await stripe.subscriptionItems.list({
          subscription: sub.stripeSubscriptionId,
        })
        const meteredItem = items.data.find(
          (item) => item.price.id === meteredPriceId
        )
        if (!meteredItem) continue

        const storageGb = Math.ceil(totalBytes / (1024 * 1024 * 1024))
        await stripe.subscriptionItems.createUsageRecord(meteredItem.id, {
          quantity: storageGb,
          action: "set",
        })
      } catch (err) {
        console.error(`Failed to report storage for org ${orgId}:`, err)
      }
    }
  },
})
