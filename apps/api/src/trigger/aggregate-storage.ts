import { buckets, createDb, subscription } from "@buckt/db";
import { schedules } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { resolveCredentials } from "../lib/aws/client-factory";
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
        const credentials = await resolveCredentials(bucket.awsAccountId, db);
        const sizeBytes = await getBucketSizeBytes(
          bucket.s3BucketName,
          bucket.region,
          credentials
        );
        if (sizeBytes > 0) {
          await db
            .update(buckets)
            .set({ storageUsedBytes: sizeBytes })
            .where(eq(buckets.id, bucket.id));
        }
        const effectiveBytes =
          sizeBytes > 0 ? sizeBytes : (bucket.storageUsedBytes ?? 0);
        orgStorage.set(
          bucket.orgId,
          (orgStorage.get(bucket.orgId) ?? 0) + effectiveBytes
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
