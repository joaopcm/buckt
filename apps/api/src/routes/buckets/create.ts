import { awsAccounts, buckets } from "@buckt/db";
import { createBucketSchema } from "@buckt/shared";
import { and, eq, ne, sql } from "drizzle-orm";
import type { Context } from "hono";
import { db } from "../../lib/db";
import { provisionBucket } from "../../trigger/provision-bucket";
import { error } from "../../utils/response";

export async function createBucket(c: Context) {
  const body = await c.req.json();
  const parsed = createBucketSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 400, parsed.error.issues[0].message);
  }

  const {
    name,
    customDomain,
    region,
    visibility,
    cachePreset,
    corsOrigins,
    lifecycleTtlDays,
    optimizationMode,
    domainConnectProvider,
    awsAccountId,
  } = parsed.data;
  const orgId = c.get("orgId");
  const planLimits = c.get("planLimits");

  if (awsAccountId) {
    const plan = c.get("plan") as string;
    if (plan === "free") {
      return error(c, 402, "BYOA requires a paid plan. Upgrade to enable.");
    }
    const [account] = await db
      .select({ id: awsAccounts.id, status: awsAccounts.status })
      .from(awsAccounts)
      .where(
        and(eq(awsAccounts.id, awsAccountId), eq(awsAccounts.orgId, orgId))
      )
      .limit(1);
    if (!account) {
      return error(c, 404, "AWS account not found");
    }
    if (account.status !== "active") {
      return error(c, 400, "AWS account is not active");
    }
  }

  const slug = customDomain.replace(/\./g, "-");
  const s3BucketName = `buckt-${orgId.slice(0, 8)}-${slug}`.toLowerCase();

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(buckets)
    .where(and(eq(buckets.orgId, orgId), ne(buckets.status, "deleting")));

  if (count >= planLimits.maxBuckets) {
    return error(
      c,
      402,
      `Plan limit reached: maximum ${planLimits.maxBuckets} bucket(s)`
    );
  }

  const [existing] = await db
    .select({ id: buckets.id })
    .from(buckets)
    .where(eq(buckets.customDomain, customDomain))
    .limit(1);

  if (existing) {
    return error(c, 409, "Domain already in use");
  }

  if (optimizationMode !== undefined && optimizationMode !== "none") {
    const plan = c.get("plan") as string;
    if (plan === "free") {
      return error(
        c,
        402,
        "Optimization requires a paid plan. Upgrade to enable."
      );
    }
  }

  const managedSettings = awsAccountId
    ? {
        visibility: true,
        cache: true,
        cors: true,
        lifecycle: true,
        optimization: true,
      }
    : {};

  const [bucket] = await db
    .insert(buckets)
    .values({
      orgId,
      name,
      slug,
      s3BucketName,
      customDomain,
      region,
      visibility,
      cachePreset,
      corsOrigins,
      lifecycleTtlDays,
      optimizationMode,
      domainConnectProvider,
      awsAccountId: awsAccountId ?? null,
      managedSettings,
      status: "pending",
    })
    .returning();

  const handle = await provisionBucket.trigger({ bucketId: bucket.id });
  await db
    .update(buckets)
    .set({ provisioningJobId: handle.id })
    .where(eq(buckets.id, bucket.id));

  return c.json({ data: bucket, error: null, meta: null }, 201);
}
