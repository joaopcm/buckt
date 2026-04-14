import { awsAccounts, buckets, subscription } from "@buckt/db";
import {
  importBucketsSchema,
  type ManagedSettings,
  PLAN_LIMITS,
  type PlanName,
} from "@buckt/shared";
import { and, count, eq } from "drizzle-orm";
import type { Context } from "hono";
import {
  getBucketRegion,
  readBucketSettings,
} from "../../lib/aws/bucket-settings";
import { findDistributionForBucket } from "../../lib/aws/cloudfront";
import { assumeRole } from "../../lib/aws/sts";
import { db } from "../../lib/db";
import { error } from "../../utils/response";

export async function importBuckets(c: Context) {
  const orgId = c.get("orgId");
  const id = c.req.param("id") as string;
  const body = await c.req.json();
  const parsed = importBucketsSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 400, parsed.error.issues[0].message);
  }

  const [account] = await db
    .select()
    .from(awsAccounts)
    .where(and(eq(awsAccounts.id, id), eq(awsAccounts.orgId, orgId)))
    .limit(1);

  if (!account || account.status !== "active") {
    return error(c, 404, "Active AWS account not found");
  }

  const [sub] = await db
    .select({ plan: subscription.plan })
    .from(subscription)
    .where(
      and(
        eq(subscription.referenceId, orgId),
        eq(subscription.status, "active")
      )
    )
    .limit(1);

  const plan = (sub?.plan ?? "free") as PlanName;
  const limits = PLAN_LIMITS[plan];

  const [{ bucketCount }] = await db
    .select({ bucketCount: count() })
    .from(buckets)
    .where(eq(buckets.orgId, orgId));

  if (bucketCount + parsed.data.bucketNames.length > limits.maxBuckets) {
    return error(
      c,
      402,
      `Importing would exceed plan limit of ${limits.maxBuckets} bucket(s)`
    );
  }

  const credentials = await assumeRole(account.roleArn, account.externalId);

  const defaultManagedSettings: ManagedSettings = {
    visibility: false,
    cache: false,
    cors: false,
    lifecycle: false,
    optimization: false,
  };

  const imported: (typeof buckets.$inferSelect)[] = [];

  for (const bucketName of parsed.data.bucketNames) {
    const region = await getBucketRegion(bucketName, credentials);
    const settings = await readBucketSettings(bucketName, region, credentials);
    const distInfo = await findDistributionForBucket(
      bucketName,
      region,
      credentials
    );

    const slug = distInfo?.customDomain
      ? distInfo.customDomain.replace(/\./g, "-")
      : bucketName.replace(/\./g, "-");

    const [bucket] = await db
      .insert(buckets)
      .values({
        orgId,
        name: bucketName,
        slug,
        s3BucketName: bucketName,
        region,
        customDomain: distInfo?.customDomain ?? "",
        cloudfrontDistributionId: distInfo?.distributionId ?? null,
        acmCertArn: distInfo?.certArn ?? null,
        visibility: settings.visibility,
        corsOrigins: settings.corsOrigins,
        lifecycleTtlDays: settings.lifecycleTtlDays,
        awsAccountId: id,
        isImported: true,
        managedSettings: defaultManagedSettings,
        status: "active",
      })
      .returning();

    imported.push(bucket);
  }

  return c.json({ data: imported, error: null, meta: null }, 201);
}
