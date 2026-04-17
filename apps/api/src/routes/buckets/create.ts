import { awsAccounts, buckets } from "@buckt/db";
import { createBucketSchema, generateManagedSubdomain } from "@buckt/shared";
import { and, eq, ne, sql } from "drizzle-orm";
import type { Context } from "hono";
import { db } from "../../lib/db";
import { provisionBucket } from "../../trigger/provision-bucket";
import { error } from "../../utils/response";

const MANAGED_SUBDOMAIN_MAX_ATTEMPTS = 5;

interface DomainInput {
  awsAccountId?: string;
  customDomain?: string;
  isManagedDomain: boolean;
}

interface ErrorResult {
  message: string;
  status: 400 | 402 | 404 | 409 | 500;
}

async function allocateManagedSubdomain(): Promise<string | null> {
  for (let attempt = 0; attempt < MANAGED_SUBDOMAIN_MAX_ATTEMPTS; attempt++) {
    const candidate = generateManagedSubdomain();
    const [existing] = await db
      .select({ id: buckets.id })
      .from(buckets)
      .where(eq(buckets.customDomain, candidate))
      .limit(1);
    if (!existing) {
      return candidate;
    }
  }
  return null;
}

async function validateAwsAccount(
  input: DomainInput,
  orgId: string,
  plan: string
): Promise<ErrorResult | null> {
  if (!input.awsAccountId) {
    return null;
  }
  if (input.isManagedDomain) {
    return { status: 400, message: "BYOA requires a custom domain" };
  }
  if (plan === "free") {
    return {
      status: 402,
      message: "BYOA requires a paid plan. Upgrade to enable.",
    };
  }
  const [account] = await db
    .select({ id: awsAccounts.id, status: awsAccounts.status })
    .from(awsAccounts)
    .where(
      and(eq(awsAccounts.id, input.awsAccountId), eq(awsAccounts.orgId, orgId))
    )
    .limit(1);
  if (!account) {
    return { status: 404, message: "AWS account not found" };
  }
  if (account.status !== "active") {
    return { status: 400, message: "AWS account is not active" };
  }
  return null;
}

async function resolveDomain(
  input: DomainInput
): Promise<{ domain: string } | ErrorResult> {
  if (input.isManagedDomain) {
    const allocated = await allocateManagedSubdomain();
    if (!allocated) {
      return {
        status: 500,
        message: "Could not allocate a subdomain, please try again",
      };
    }
    return { domain: allocated };
  }
  if (!input.customDomain) {
    return { status: 400, message: "customDomain is required" };
  }
  const [existing] = await db
    .select({ id: buckets.id })
    .from(buckets)
    .where(eq(buckets.customDomain, input.customDomain))
    .limit(1);
  if (existing) {
    return { status: 409, message: "Domain already in use" };
  }
  return { domain: input.customDomain };
}

export async function createBucket(c: Context) {
  const body = await c.req.json();
  const parsed = createBucketSchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 400, parsed.error.issues[0].message);
  }

  const orgId = c.get("orgId");
  const planLimits = c.get("planLimits");
  const plan = c.get("plan") as string;

  const awsError = await validateAwsAccount(parsed.data, orgId, plan);
  if (awsError) {
    return error(c, awsError.status, awsError.message);
  }

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

  const domainResult = await resolveDomain(parsed.data);
  if ("status" in domainResult) {
    return error(c, domainResult.status, domainResult.message);
  }
  const resolvedDomain = domainResult.domain;

  const {
    name,
    isManagedDomain,
    region,
    visibility,
    cachePreset,
    corsOrigins,
    lifecycleTtlDays,
    optimizationMode,
    domainConnectProvider,
    awsAccountId,
  } = parsed.data;

  if (
    optimizationMode !== undefined &&
    optimizationMode !== "none" &&
    plan === "free"
  ) {
    return error(
      c,
      402,
      "Optimization requires a paid plan. Upgrade to enable."
    );
  }

  const slug = resolvedDomain.replace(/\./g, "-");
  const s3BucketName = `buckt-${orgId.slice(0, 8)}-${slug}`.toLowerCase();

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
      customDomain: resolvedDomain,
      region,
      visibility,
      cachePreset,
      corsOrigins,
      lifecycleTtlDays,
      optimizationMode,
      domainConnectProvider: isManagedDomain ? null : domainConnectProvider,
      awsAccountId: awsAccountId ?? null,
      isManagedDomain,
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
