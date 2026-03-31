import { describe, it, expect, beforeEach } from "vitest"
import app from "../app"
import { TEST_ORG_ID, createTestApiKey, cleanDb } from "./helpers"

describe("key endpoints", () => {
  let systemKey: string

  beforeEach(async () => {
    await cleanDb()
    const { rawKey } = await createTestApiKey()
    systemKey = rawKey
  })

  function req(method: string, path: string, opts?: { body?: unknown; key?: string }) {
    const headers: Record<string, string> = {}
    if (opts?.key !== undefined) {
      headers.Authorization = `Bearer ${opts.key}`
    } else {
      headers.Authorization = `Bearer ${systemKey}`
    }
    if (opts?.body) {
      headers["Content-Type"] = "application/json"
    }
    return app.request(path, {
      method,
      headers,
      body: opts?.body ? JSON.stringify(opts.body) : undefined,
    })
  }

  describe("POST /api/keys", () => {
    it("creates an API key with specified permissions", async () => {
      const res = await req("POST", "/api/keys", {
        body: { name: "My Key", permissions: ["buckets:read", "files:read"] },
      })
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
      const res = await req("POST", "/api/keys", {
        key: userKey,
        body: { name: "Sneaky", permissions: ["buckets:read"] },
      })
      expect(res.status).toBe(403)
    })

    it("rejects empty permissions", async () => {
      const res = await req("POST", "/api/keys", {
        body: { name: "No Perms", permissions: [] },
      })
      expect(res.status).toBe(400)
    })

    it("rejects invalid permissions", async () => {
      const res = await req("POST", "/api/keys", {
        body: { name: "Bad Perms", permissions: ["admin:all"] },
      })
      expect(res.status).toBe(400)
    })
  })

  describe("GET /api/keys", () => {
    it("lists non-system keys", async () => {
      await req("POST", "/api/keys", {
        body: { name: "Key 1", permissions: ["buckets:read"] },
      })
      await req("POST", "/api/keys", {
        body: { name: "Key 2", permissions: ["files:read"] },
      })

      const res = await req("GET", "/api/keys")
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data).toHaveLength(2)
      expect(json.data.every((k: { id: string }) => "id" in k)).toBe(true)
      expect(json.data.every((k: { key?: string }) => !("key" in k && k.key))).toBe(true)
    })

    it("excludes system keys from listing", async () => {
      const res = await req("GET", "/api/keys")
      const json = await res.json()
      expect(json.data).toHaveLength(0)
    })

    it("supports cursor-based pagination", async () => {
      for (let i = 0; i < 3; i++) {
        await req("POST", "/api/keys", {
          body: { name: `Key ${i}`, permissions: ["buckets:read"] },
        })
      }

      const page1 = await req("GET", "/api/keys?limit=2")
      const json1 = await page1.json()
      expect(json1.data).toHaveLength(2)
      expect(json1.meta.nextCursor).toBeTruthy()

      const page2 = await req("GET", `/api/keys?limit=2&cursor=${json1.meta.nextCursor}`)
      const json2 = await page2.json()
      expect(json2.data).toHaveLength(1)
      expect(json2.meta.nextCursor).toBeNull()
    })
  })

  describe("DELETE /api/keys/:id", () => {
    it("revokes a user key", async () => {
      const createRes = await req("POST", "/api/keys", {
        body: { name: "Temp", permissions: ["buckets:read"] },
      })
      const { data: created } = await createRes.json()

      const res = await req("DELETE", `/api/keys/${created.id}`)
      expect(res.status).toBe(200)

      const listRes = await req("GET", "/api/keys")
      const json = await listRes.json()
      expect(json.data).toHaveLength(0)
    })

    it("prevents deleting system key", async () => {
      const { apiKey } = await createTestApiKey({ orgId: TEST_ORG_ID })
      const res = await req("DELETE", `/api/keys/${apiKey.id}`)
      expect(res.status).toBe(403)
    })

    it("rejects deletion from non-system key", async () => {
      const createRes = await req("POST", "/api/keys", {
        body: { name: "Target", permissions: ["buckets:read"] },
      })
      const { data: target } = await createRes.json()

      const { rawKey: userKey } = await createTestApiKey({
        permissions: ["buckets:read"],
        system: false,
      })
      const res = await req("DELETE", `/api/keys/${target.id}`, { key: userKey })
      expect(res.status).toBe(403)
    })

    it("returns 404 for non-existent key", async () => {
      const res = await req("DELETE", "/api/keys/non-existent-id")
      expect(res.status).toBe(404)
    })
  })
})
