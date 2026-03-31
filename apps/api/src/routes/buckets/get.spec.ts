import { describe, it, expect, beforeEach } from "vitest"
import app from "../../app"
import { createTestApiKey, cleanDb } from "../../lib/test-helpers"

describe("GET /api/buckets/:id", () => {
  let apiKey: string

  beforeEach(async () => {
    await cleanDb()
    const { rawKey } = await createTestApiKey()
    apiKey = rawKey
  })

  async function createBucket(name: string, domain: string) {
    const res = await app.request("/api/buckets", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name, customDomain: domain }),
    })
    const json = await res.json()
    return json.data
  }

  it("returns bucket detail", async () => {
    const bucket = await createBucket("Detail", "detail.test.com")

    const res = await app.request(`/api/buckets/${bucket.id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.id).toBe(bucket.id)
  })

  it("returns 404 for non-existent bucket", async () => {
    const res = await app.request("/api/buckets/non-existent-id", {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    expect(res.status).toBe(404)
  })

  it("returns 404 for bucket in another org", async () => {
    const bucket = await createBucket("Mine", "mine.test.com")

    const { rawKey: otherKey } = await createTestApiKey({ orgId: "other-org" })
    const res = await app.request(`/api/buckets/${bucket.id}`, {
      headers: { Authorization: `Bearer ${otherKey}` },
    })
    expect(res.status).toBe(404)
  })
})
