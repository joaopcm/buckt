import { apiKeys } from "@buckt/db";
import { and, asc, eq, gt } from "drizzle-orm";
import type { Context } from "hono";
import { db } from "../../lib/db";
import { success } from "../../utils/response";

export async function listKeys(c: Context) {
  const orgId = c.get("orgId");
  const cursor = c.req.query("cursor");
  const limit = Math.min(Number(c.req.query("limit")) || 20, 100);

  const conditions = [eq(apiKeys.orgId, orgId)];
  if (cursor) {
    conditions.push(gt(apiKeys.id, cursor));
  }

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      permissions: apiKeys.permissions,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(and(...conditions))
    .orderBy(asc(apiKeys.id))
    .limit(limit + 1);

  const hasMore = keys.length > limit;
  if (hasMore) {
    keys.pop();
  }

  const nextCursor = hasMore ? (keys.at(-1)?.id ?? null) : null;

  return success(c, keys, { nextCursor, limit });
}
