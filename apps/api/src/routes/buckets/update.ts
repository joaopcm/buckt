import { buckets } from "@buckt/db";
import { type ManagedSettings, updateBucketSchema } from "@buckt/shared";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import {
  setBucketCors,
  setBucketLifecycle,
  setBucketPrivate,
  setBucketPublic,
} from "../../lib/aws/bucket-settings";
import { resolveCredentials } from "../../lib/aws/client-factory";
import { db } from "../../lib/db";
import { isBucketInScope } from "../../utils/bucket-scope";
import { error, success } from "../../utils/response";

const UPDATE_TO_MANAGED_KEY = {
  visibility: "visibility",
  cachePreset: "cache",
  cacheControlOverride: "cache",
  corsOrigins: "cors",
  lifecycleTtlDays: "lifecycle",
  optimizationMode: "optimization",
} as const satisfies Record<string, keyof ManagedSettings>;

type Updates = ReturnType<typeof updateBucketSchema.parse>;

function findUnmanagedKey(
  managed: ManagedSettings,
  updates: Updates
): keyof ManagedSettings | null {
  for (const field of Object.keys(updates) as (keyof Updates)[]) {
    const managedKey = UPDATE_TO_MANAGED_KEY[
      field as keyof typeof UPDATE_TO_MANAGED_KEY
    ] as keyof ManagedSettings | undefined;
    if (managedKey && managed[managedKey] !== true) {
      return managedKey;
    }
  }
  return null;
}

async function syncBucketSettingsToAws(
  bucket: typeof buckets.$inferSelect,
  updates: Updates
) {
  const credentials = await resolveCredentials(bucket.awsAccountId);

  if (
    updates.visibility !== undefined &&
    updates.visibility !== bucket.visibility
  ) {
    const setter =
      updates.visibility === "private" ? setBucketPrivate : setBucketPublic;
    await setter(bucket.s3BucketName, bucket.region, credentials);
  }

  if (updates.corsOrigins !== undefined) {
    await setBucketCors(
      bucket.s3BucketName,
      updates.corsOrigins,
      bucket.region,
      credentials
    );
  }

  if (updates.lifecycleTtlDays !== undefined) {
    await setBucketLifecycle(
      bucket.s3BucketName,
      updates.lifecycleTtlDays,
      bucket.region,
      credentials
    );
  }
}

export async function updateBucket(c: Context) {
  const orgId = c.get("orgId") as string;
  const id = c.req.param("id") as string;

  if (!isBucketInScope(c, id)) {
    return error(c, 404, "Bucket not found");
  }

  const body = await c.req.json();
  const parsed = updateBucketSchema.safeParse(body);

  if (!parsed.success) {
    return error(c, 400, parsed.error.issues[0].message);
  }

  const [bucket] = await db
    .select()
    .from(buckets)
    .where(and(eq(buckets.id, id), eq(buckets.orgId, orgId)))
    .limit(1);

  if (!bucket) {
    return error(c, 404, "Bucket not found");
  }

  const updates = parsed.data;

  if (Object.keys(updates).length === 0) {
    return success(c, bucket);
  }

  if (bucket.isImported) {
    const unmanaged = findUnmanagedKey(
      (bucket.managedSettings ?? {}) as ManagedSettings,
      updates
    );
    if (unmanaged) {
      return error(
        c,
        403,
        `This setting is not managed by Buckt for this bucket. Enable ${unmanaged} management first.`
      );
    }
  }

  if (
    updates.optimizationMode !== undefined &&
    updates.optimizationMode !== "none" &&
    c.get("plan") === "free"
  ) {
    return error(
      c,
      402,
      "Optimization requires a paid plan. Upgrade to enable."
    );
  }

  await syncBucketSettingsToAws(bucket, updates);

  const [updated] = await db
    .update(buckets)
    .set(updates)
    .where(eq(buckets.id, id))
    .returning();

  return success(c, updated);
}
