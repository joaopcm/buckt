import { apiKeys, buckets } from "@buckt/db";
import { createKeySchema } from "@buckt/shared";
import { and, eq, inArray } from "drizzle-orm";
import type { Context } from "hono";
import { db } from "../../lib/db";
import { generateApiKey } from "../../utils/hash";
import { error } from "../../utils/response";

export async function createKey(c: Context) {
  const body = await c.req.json();
  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) {
    return error(c, 400, parsed.error.issues[0].message);
  }

  const { name, permissions, expiresAt, bucketIds } = parsed.data;
  const orgId = c.get("orgId");

  if (bucketIds && bucketIds.length > 0) {
    const validBuckets = await db
      .select({ id: buckets.id })
      .from(buckets)
      .where(and(eq(buckets.orgId, orgId), inArray(buckets.id, bucketIds)));
    const validIds = new Set(validBuckets.map((b) => b.id));
    const invalidIds = bucketIds.filter((id) => !validIds.has(id));
    if (invalidIds.length > 0) {
      return error(c, 400, `Invalid bucket IDs: ${invalidIds.join(", ")}`);
    }
  }

  const { key, prefix, hashedKey } = generateApiKey();

  const [apiKey] = await db
    .insert(apiKeys)
    .values({
      orgId,
      name,
      hashedKey,
      prefix,
      permissions,
      expiresAt: expiresAt ?? null,
      bucketIds: bucketIds ?? null,
    })
    .returning();

  return c.json({ data: { ...apiKey, key }, error: null, meta: null }, 201);
}
