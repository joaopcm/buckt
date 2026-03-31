import { describe, it, expect, vi, beforeEach } from "vitest"
import { Buckt } from "../index"

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    json: () => Promise.resolve(body),
  })
}

describe("BucketsClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  const client = new Buckt({ apiKey: "bkt_test", baseUrl: "https://api.test.com" })

  it("creates a bucket", async () => {
    const bucket = { id: "1", name: "Test", customDomain: "test.com", status: "pending" }
    vi.stubGlobal("fetch", mockFetch(201, { data: bucket, error: null, meta: null }))

    const result = await client.buckets.create({ name: "Test", customDomain: "test.com" })
    expect(result.id).toBe("1")
    expect(result.status).toBe("pending")
  })

  it("lists buckets with cursor pagination", async () => {
    const buckets = [{ id: "1" }, { id: "2" }]
    const meta = { nextCursor: "2", limit: 20 }
    vi.stubGlobal("fetch", mockFetch(200, { data: buckets, error: null, meta }))

    const result = await client.buckets.list({ limit: 20 })
    expect(result.data).toHaveLength(2)
    expect(result.meta.nextCursor).toBe("2")
  })

  it("gets a bucket by id", async () => {
    const bucket = { id: "1", name: "Test" }
    vi.stubGlobal("fetch", mockFetch(200, { data: bucket, error: null, meta: null }))

    const result = await client.buckets.get("1")
    expect(result.id).toBe("1")
  })

  it("deletes a bucket", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { data: { id: "1", status: "deleting" }, error: null, meta: null }))

    await expect(client.buckets.delete("1")).resolves.toBeUndefined()
  })
})
