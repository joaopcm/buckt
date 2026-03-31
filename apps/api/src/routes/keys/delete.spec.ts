import { describe, it, expect, beforeEach } from "vitest"
import app from "../../app"
import { TEST_ORG_ID, createTestApiKey, cleanDb } from "../../lib/test-helpers"

describe("DELETE /api/keys/:id", () => {
  let systemKey: string

  beforeEach(async () => {
    await cleanDb()
    const { rawKey } = await createTestApiKey()
    systemKey = rawKey
  })

  async function createKey(name: string) {
    const res = await app.request("/api/keys", {
      method: "POST",
      headers: { Authorization: `Bearer ${systemKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name, permissions: ["buckets:read"] }),
    })
    const json = await res.json()
    return json.data
  }

  it("revokes a user key", async () => {
    const created = await createKey("Temp")

    const res = await app.request(`/api/keys/${created.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${systemKey}` },
    })
    expect(res.status).toBe(200)

    const listRes = await app.request("/api/keys", {
      headers: { Authorization: `Bearer ${systemKey}` },
    })
    const json = await listRes.json()
    expect(json.data).toHaveLength(0)
  })

  it("prevents deleting system key", async () => {
    const { apiKey } = await createTestApiKey({ orgId: TEST_ORG_ID })
    const res = await app.request(`/api/keys/${apiKey.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${systemKey}` },
    })
    expect(res.status).toBe(403)
  })

  it("rejects deletion from non-system key", async () => {
    const target = await createKey("Target")
    const { rawKey: userKey } = await createTestApiKey({ permissions: ["buckets:read"], system: false })

    const res = await app.request(`/api/keys/${target.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${userKey}` },
    })
    expect(res.status).toBe(403)
  })

  it("returns 404 for non-existent key", async () => {
    const res = await app.request("/api/keys/non-existent-id", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${systemKey}` },
    })
    expect(res.status).toBe(404)
  })
})
