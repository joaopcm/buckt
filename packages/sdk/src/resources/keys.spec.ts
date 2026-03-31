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

describe("KeysClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  const client = new Buckt({ apiKey: "bkt_test", baseUrl: "https://api.test.com" })

  it("creates an API key", async () => {
    const key = { id: "1", name: "My Key", key: "bkt_abc123", permissions: ["buckets:read"] }
    vi.stubGlobal("fetch", mockFetch(201, { data: key, error: null, meta: null }))

    const result = await client.keys.create({ name: "My Key", permissions: ["buckets:read"] })
    expect(result.key).toMatch(/^bkt_/)
    expect(result.name).toBe("My Key")
  })

  it("lists keys with pagination", async () => {
    const keys = [{ id: "1" }, { id: "2" }]
    const meta = { nextCursor: null, limit: 20 }
    vi.stubGlobal("fetch", mockFetch(200, { data: keys, error: null, meta }))

    const result = await client.keys.list()
    expect(result.data).toHaveLength(2)
    expect(result.meta.nextCursor).toBeNull()
  })

  it("deletes a key", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { data: { id: "1" }, error: null, meta: null }))

    await expect(client.keys.delete("1")).resolves.toBeUndefined()
  })
})
