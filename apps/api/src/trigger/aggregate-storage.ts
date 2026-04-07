import { buckets, createDb, subscription } from "@buckt/db";
import { schedules } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { getBucketSizeBytes } from "../lib/aws/cloudwatch";

const db = createDb(process.env.DATABASE_PUBLIC_URL ?? "");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

export const aggregateStorage = schedules.task({
  id: "aggregate-storage",
  cron: "0 2 * * *",
  run: async () => {
    const activeBuckets = await db
      .select()
      .from(buckets)
      .where(eq(buckets.status, "active"));
    const orgStorage = new Map<string, number>();

    for (const bucket of activeBuckets) {
      try {
        const sizeBytes = await getBucketSizeBytes(bucket.s3BucketName);
        await db
          .update(buckets)
          .set({ storageUsedBytes: sizeBytes })
          .where(eq(buckets.id, bucket.id));
        orgStorage.set(
          bucket.orgId,
          (orgStorage.get(bucket.orgId) ?? 0) + sizeBytes
        );
      } catch (err) {
        console.error(`Failed to get metrics for bucket ${bucket.id}:`, err);
      }
    }

    const meterEventName = process.env.STRIPE_METERED_STORAGE_PRICE_ID;
    if (!meterEventName) {
      return;
    }

    for (const [orgId, totalBytes] of orgStorage) {
      try {
        const [sub] = await db
          .select()
          .from(subscription)
          .where(eq(subscription.referenceId, orgId))
          .limit(1);
        if (!sub?.stripeCustomerId) {
          continue;
        }

        const storageGb = Math.ceil(totalBytes / (1024 * 1024 * 1024));
        await stripe.billing.meterEvents.create({
          event_name: meterEventName,
          payload: {
            stripe_customer_id: sub.stripeCustomerId,
            value: String(storageGb),
          },
        });
      } catch (err) {
        console.error(`Failed to report storage for org ${orgId}:`, err);
      }
    }
  },
});
