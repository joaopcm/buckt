import { describe, it, expect, beforeEach, vi } from "vitest"
import app from "../../app"
import { createTestApiKey, createActiveBucket, cleanDb } from "../../lib/test-helpers"

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }))
vi.mock("../../lib/s3", () => ({
  s3: { send: mockSend },
}))

describe("DELETE /api/buckets/:id/files/*", () => {
  let apiKey: string
  let bucketId: string

  beforeEach(async () => {
    await cleanDb()
    mockSend.mockReset()
    const { rawKey } = await createTestApiKey()
    apiKey = rawKey
    const bucket = await createActiveBucket(apiKey)
    bucketId = bucket.id
  })

  function req(path: string, key?: string) {
    return app.request(`/api/buckets/${bucketId}/files/${path}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${key ?? apiKey}` },
    })
  }

  it("deletes a file", async () => {
    mockSend
      .mockResolvedValueOnce({ ContentLength: 512 })
      .mockResolvedValueOnce({})

    const res = await req("docs/old.txt")
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.key).toBe("docs/old.txt")
  })

  it("returns 404 for nonexistent file", async () => {
    const notFound = new Error("NotFound")
    notFound.name = "NotFound"
    mockSend.mockRejectedValueOnce(notFound)

    const res = await req("missing.txt")
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error.message).toBe("File not found")
  })

  it("rejects without auth", async () => {
    const res = await app.request(`/api/buckets/${bucketId}/files/test.txt`, {
      method: "DELETE",
    })
    expect(res.status).toBe(401)
  })

  it("rejects with insufficient permissions", async () => {
    const { rawKey } = await createTestApiKey({ permissions: ["files:read"] })
    const res = await req("test.txt", rawKey)
    expect(res.status).toBe(403)
  })

  it("returns 404 for nonexistent bucket", async () => {
    const res = await app.request("/api/buckets/nonexistent/files/test.txt", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    expect(res.status).toBe(404)
  })
})
