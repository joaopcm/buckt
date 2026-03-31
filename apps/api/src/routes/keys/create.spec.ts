import { describe, it, expect, beforeEach } from "vitest"
import app from "../../app"
import { createTestApiKey, cleanDb } from "../../lib/test-helpers"

describe("POST /api/keys", () => {
  let systemKey: string

  beforeEach(async () => {
    await cleanDb()
    const { rawKey } = await createTestApiKey()
    systemKey = rawKey
  })

  function req(body: unknown, key?: string) {
    return app.request("/api/keys", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key ?? systemKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
  }

  it("creates an API key with specified permissions", async () => {
    const res = await req({ name: "My Key", permissions: ["buckets:read", "files:read"] })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.name).toBe("My Key")
    expect(json.data.key).toMatch(/^bkt_/)
    expect(json.data.permissions).toEqual(["buckets:read", "files:read"])
    expect(json.data.system).toBe(false)
  })

  it("rejects creation from non-system key", async () => {
    const { rawKey: userKey } = await createTestApiKey({
      permissions: ["buckets:read", "buckets:write"],
      system: false,
    })
    const res = await req({ name: "Sneaky", permissions: ["buckets:read"] }, userKey)
    expect(res.status).toBe(403)
  })

  it("rejects empty permissions", async () => {
    const res = await req({ name: "No Perms", permissions: [] })
    expect(res.status).toBe(400)
  })

  it("rejects invalid permissions", async () => {
    const res = await req({ name: "Bad Perms", permissions: ["admin:all"] })
    expect(res.status).toBe(400)
  })
})
