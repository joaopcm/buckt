import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../../app";
import {
  cleanDb,
  createActiveBucket,
  createTestApiKey,
} from "../../lib/test-helpers";

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));
vi.mock("../../lib/s3", () => ({
  s3: { send: mockSend },
}));

describe("GET /api/buckets/:id/files", () => {
  let apiKey: string;
  let bucketId: string;

  beforeEach(async () => {
    await cleanDb();
    mockSend.mockReset();
    const { rawKey } = await createTestApiKey();
    apiKey = rawKey;
    const bucket = await createActiveBucket(apiKey);
    bucketId = bucket.id;
  });

  function req(query = "", key?: string) {
    return app.request(`/api/buckets/${bucketId}/files${query}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${key ?? apiKey}` },
    });
  }

  it("lists files", async () => {
    mockSend.mockResolvedValueOnce({
      Contents: [
        { Key: "a.txt", Size: 100, LastModified: new Date("2024-01-01") },
        { Key: "b.txt", Size: 200, LastModified: new Date("2024-01-02") },
      ],
      NextContinuationToken: undefined,
    });

    const res = await req();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(2);
    expect(json.data[0].key).toBe("a.txt");
    expect(json.data[0].size).toBe(100);
    expect(json.meta.limit).toBe(100);
  });

  it("passes prefix and cursor to S3", async () => {
    mockSend.mockResolvedValueOnce({ Contents: [] });

    await req("?prefix=docs/&cursor=token123&limit=10");
    const command = mockSend.mock.calls[0][0];
    expect(command.input.Prefix).toBe("docs/");
    expect(command.input.ContinuationToken).toBe("token123");
    expect(command.input.MaxKeys).toBe(10);
  });

  it("returns nextCursor when truncated", async () => {
    mockSend.mockResolvedValueOnce({
      Contents: [{ Key: "a.txt", Size: 10, LastModified: new Date() }],
      NextContinuationToken: "next-token",
    });

    const res = await req();
    const json = await res.json();
    expect(json.meta.nextCursor).toBe("next-token");
  });

  it("rejects without auth", async () => {
    const res = await app.request(`/api/buckets/${bucketId}/files`, {
      method: "GET",
    });
    expect(res.status).toBe(401);
  });

  it("rejects with insufficient permissions", async () => {
    const { rawKey } = await createTestApiKey({ permissions: ["files:write"] });
    const res = await req("", rawKey);
    expect(res.status).toBe(403);
  });

  it("returns 404 for nonexistent bucket", async () => {
    const res = await app.request("/api/buckets/nonexistent/files", {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(res.status).toBe(404);
  });
});
