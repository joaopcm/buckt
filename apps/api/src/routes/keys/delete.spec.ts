import { describe, it, expect, beforeEach } from "vitest"
import app from "../../app"
import { createTestApiKey, cleanDb } from "../../lib/test-helpers"

describe("DELETE /api/keys/:id", () => {
  let apiKey: string

  beforeEach(async () => {
    await cleanDb()
    const { rawKey } = await createTestApiKey()
    apiKey = rawKey
  })

  async function createKey(name: string) {
    const res = await app.request("/api/keys", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name, permissions: ["buckets:read"] }),
    })
    const json = await res.json()
    return json.data
  }

  it("revokes a key", async () => {
    const created = await createKey("Temp")

    const res = await app.request(`/api/keys/${created.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    expect(res.status).toBe(200)
  })

  it("rejects deletion with insufficient permissions", async () => {
    const created = await createKey("Target")
    const { rawKey: limitedKey } = await createTestApiKey({ permissions: ["buckets:read"] })

    const res = await app.request(`/api/keys/${created.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${limitedKey}` },
    })
    expect(res.status).toBe(403)
  })

  it("returns 404 for non-existent key", async () => {
    const res = await app.request("/api/keys/non-existent-id", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    expect(res.status).toBe(404)
  })
})
