import { apiKeys, buckets } from "@buckt/db"
import { sql } from "drizzle-orm"
import { db } from "../lib/db"
import { generateApiKey } from "../lib/hash"
import type { Permission } from "@buckt/shared"
import { PERMISSIONS } from "@buckt/shared"

export const TEST_ORG_ID = "test-org-001"

export async function createTestApiKey(opts?: {
  orgId?: string
  permissions?: Permission[]
  system?: boolean
}) {
  const orgId = opts?.orgId ?? TEST_ORG_ID
  const permissions = opts?.permissions ?? [...PERMISSIONS]
  const system = opts?.system ?? true
  const { key, prefix, hashedKey } = generateApiKey()

  const [apiKey] = await db
    .insert(apiKeys)
    .values({ orgId, name: "test-key", hashedKey, prefix, permissions, system })
    .returning()

  return { apiKey, rawKey: key }
}

export async function cleanDb() {
  await db.delete(buckets).where(sql`1=1`)
  await db.delete(apiKeys).where(sql`1=1`)
}
