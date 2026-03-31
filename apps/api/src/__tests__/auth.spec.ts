import { describe, it, expect, beforeEach } from "vitest"
import app from "../app"
import { createTestApiKey, cleanDb } from "./helpers"

describe("auth middleware", () => {
  beforeEach(async () => {
    await cleanDb()
  })

  it("rejects requests without Authorization header", async () => {
    const res = await app.request("/api/buckets")
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.message).toBe("Missing API key")
  })

  it("rejects non-Bearer auth", async () => {
    const res = await app.request("/api/buckets", {
      headers: { Authorization: "Basic abc123" },
    })
    expect(res.status).toBe(401)
  })

  it("rejects keys without bkt_ prefix", async () => {
    const res = await app.request("/api/buckets", {
      headers: { Authorization: "Bearer invalid_key_here" },
    })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.message).toBe("Invalid API key format")
  })

  it("rejects non-existent keys", async () => {
    const res = await app.request("/api/buckets", {
      headers: { Authorization: "Bearer bkt_nonexistentkeyvalue123456" },
    })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.message).toBe("Invalid API key")
  })

  it("accepts valid API keys", async () => {
    const { rawKey } = await createTestApiKey()
    const res = await app.request("/api/buckets", {
      headers: { Authorization: `Bearer ${rawKey}` },
    })
    expect(res.status).toBe(200)
  })

  it("rejects expired keys", async () => {
    const { rawKey } = await createTestApiKey()
    const { apiKeys } = await import("@buckt/db")
    const { eq } = await import("drizzle-orm")
    const { db } = await import("../lib/db")

    const [key] = await db.select().from(apiKeys).limit(1)
    await db
      .update(apiKeys)
      .set({ expiresAt: new Date("2020-01-01") })
      .where(eq(apiKeys.id, key.id))

    const res = await app.request("/api/buckets", {
      headers: { Authorization: `Bearer ${rawKey}` },
    })
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.message).toBe("API key expired")
  })

  it("enforces permission checks", async () => {
    const { rawKey } = await createTestApiKey({
      permissions: ["files:read"],
      system: false,
    })
    const res = await app.request("/api/buckets", {
      headers: { Authorization: `Bearer ${rawKey}` },
    })
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error.message).toBe("Insufficient permissions")
  })
})
