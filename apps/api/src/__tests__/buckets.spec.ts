import { describe, it, expect, beforeEach } from "vitest"
import app from "../app"
import { TEST_ORG_ID, createTestApiKey, cleanDb } from "./helpers"

describe("bucket endpoints", () => {
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

  describe("POST /api/buckets", () => {
    it("creates a bucket", async () => {
      const res = await req("POST", "/api/buckets", {
        body: { name: "Test Bucket", customDomain: "assets.test.com" },
      })
      expect(res.status).toBe(201)
      const json = await res.json()
      expect(json.data.name).toBe("Test Bucket")
      expect(json.data.customDomain).toBe("assets.test.com")
      expect(json.data.status).toBe("pending")
      expect(json.data.orgId).toBe(TEST_ORG_ID)
    })

    it("rejects duplicate domains", async () => {
      await req("POST", "/api/buckets", {
        body: { name: "First", customDomain: "assets.test.com" },
      })
      const res = await req("POST", "/api/buckets", {
        body: { name: "Second", customDomain: "assets.test.com" },
      })
      expect(res.status).toBe(409)
    })

    it("rejects invalid domain format", async () => {
      const res = await req("POST", "/api/buckets", {
        body: { name: "Bad", customDomain: "not a domain" },
      })
      expect(res.status).toBe(400)
    })

    it("rejects missing name", async () => {
      const res = await req("POST", "/api/buckets", {
        body: { customDomain: "assets.test.com" },
      })
      expect(res.status).toBe(400)
    })

    it("rejects without auth", async () => {
      const res = await app.request("/api/buckets", { method: "POST" })
      expect(res.status).toBe(401)
    })

    it("rejects with insufficient permissions", async () => {
      const { rawKey } = await createTestApiKey({
        permissions: ["buckets:read"],
        system: false,
      })
      const res = await req("POST", "/api/buckets", {
        key: rawKey,
        body: { name: "Test", customDomain: "assets.test.com" },
      })
      expect(res.status).toBe(403)
    })
  })

  describe("GET /api/buckets", () => {
    it("lists buckets for the org", async () => {
      await req("POST", "/api/buckets", {
        body: { name: "Bucket A", customDomain: "a.test.com" },
      })
      await req("POST", "/api/buckets", {
        body: { name: "Bucket B", customDomain: "b.test.com" },
      })

      const res = await req("GET", "/api/buckets")
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data).toHaveLength(2)
    })

    it("supports cursor-based pagination", async () => {
      for (let i = 0; i < 3; i++) {
        await req("POST", "/api/buckets", {
          body: { name: `Bucket ${i}`, customDomain: `b${i}.test.com` },
        })
      }

      const page1 = await req("GET", "/api/buckets?limit=2")
      const json1 = await page1.json()
      expect(json1.data).toHaveLength(2)
      expect(json1.meta.nextCursor).toBeTruthy()

      const page2 = await req("GET", `/api/buckets?limit=2&cursor=${json1.meta.nextCursor}`)
      const json2 = await page2.json()
      expect(json2.data).toHaveLength(1)
      expect(json2.meta.nextCursor).toBeNull()
    })

    it("filters by status", async () => {
      await req("POST", "/api/buckets", {
        body: { name: "Active", customDomain: "active.test.com" },
      })

      const res = await req("GET", "/api/buckets?status=active")
      const json = await res.json()
      expect(json.data).toHaveLength(0)

      const res2 = await req("GET", "/api/buckets?status=pending")
      const json2 = await res2.json()
      expect(json2.data).toHaveLength(1)
    })

    it("isolates buckets by org", async () => {
      await req("POST", "/api/buckets", {
        body: { name: "Org1 Bucket", customDomain: "org1.test.com" },
      })

      const { rawKey: otherKey } = await createTestApiKey({ orgId: "other-org" })
      const res = await req("GET", "/api/buckets", { key: otherKey })
      const json = await res.json()
      expect(json.data).toHaveLength(0)
    })
  })

  describe("GET /api/buckets/:id", () => {
    it("returns bucket detail", async () => {
      const createRes = await req("POST", "/api/buckets", {
        body: { name: "Detail", customDomain: "detail.test.com" },
      })
      const { data: bucket } = await createRes.json()

      const res = await req("GET", `/api/buckets/${bucket.id}`)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.id).toBe(bucket.id)
    })

    it("returns 404 for non-existent bucket", async () => {
      const res = await req("GET", "/api/buckets/non-existent-id")
      expect(res.status).toBe(404)
    })

    it("returns 404 for bucket in another org", async () => {
      const createRes = await req("POST", "/api/buckets", {
        body: { name: "Mine", customDomain: "mine.test.com" },
      })
      const { data: bucket } = await createRes.json()

      const { rawKey: otherKey } = await createTestApiKey({ orgId: "other-org" })
      const res = await req("GET", `/api/buckets/${bucket.id}`, { key: otherKey })
      expect(res.status).toBe(404)
    })
  })

  describe("DELETE /api/buckets/:id", () => {
    it("sets bucket status to deleting", async () => {
      const createRes = await req("POST", "/api/buckets", {
        body: { name: "ToDelete", customDomain: "delete.test.com" },
      })
      const { data: bucket } = await createRes.json()

      const res = await req("DELETE", `/api/buckets/${bucket.id}`)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.data.status).toBe("deleting")
    })

    it("rejects deleting an already-deleting bucket", async () => {
      const createRes = await req("POST", "/api/buckets", {
        body: { name: "ToDelete", customDomain: "delete2.test.com" },
      })
      const { data: bucket } = await createRes.json()

      await req("DELETE", `/api/buckets/${bucket.id}`)
      const res = await req("DELETE", `/api/buckets/${bucket.id}`)
      expect(res.status).toBe(409)
    })

    it("returns 404 for non-existent bucket", async () => {
      const res = await req("DELETE", "/api/buckets/non-existent-id")
      expect(res.status).toBe(404)
    })
  })
})
