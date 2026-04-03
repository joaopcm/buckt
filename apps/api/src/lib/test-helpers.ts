import { apiKeys, buckets, subscription } from "@buckt/db";
import type { Permission } from "@buckt/shared";
import { PERMISSIONS } from "@buckt/shared";
import { eq, sql } from "drizzle-orm";
import app from "../app";
import { db } from "../lib/db";
import { generateApiKey } from "../lib/hash";

export const TEST_ORG_ID = "test-org-001";

export async function createTestApiKey(opts?: {
  orgId?: string;
  permissions?: Permission[];
}) {
  const orgId = opts?.orgId ?? TEST_ORG_ID;
  const permissions = opts?.permissions ?? [...PERMISSIONS];
  const { key, prefix, hashedKey } = generateApiKey();

  const [apiKey] = await db
    .insert(apiKeys)
    .values({ orgId, name: "test-key", hashedKey, prefix, permissions })
    .returning();

  return { apiKey, rawKey: key };
}

export async function cleanDb() {
  await db.delete(buckets).where(sql`1=1`);
  await db.delete(apiKeys).where(sql`1=1`);
  await db.delete(subscription).where(sql`1=1`);
}

export async function insertProSubscription(orgId = TEST_ORG_ID) {
  await db.insert(subscription).values({
    id: `sub-pro-${orgId}`,
    plan: "pro",
    referenceId: orgId,
    status: "active",
  });
}

export async function createActiveBucket(
  apiKey: string,
  opts?: { name?: string; customDomain?: string }
) {
  const res = await app.request("/api/buckets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: opts?.name ?? "Test Bucket",
      customDomain: opts?.customDomain ?? "assets.test.com",
    }),
  });

  const json = await res.json();
  const bucket = json.data;

  await db
    .update(buckets)
    .set({ status: "active" })
    .where(eq(buckets.id, bucket.id));

  return { ...bucket, status: "active" as const };
}
