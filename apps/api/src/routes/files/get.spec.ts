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

describe("GET /api/buckets/:id/files/*", () => {
  let apiKey: string;
  let bucketId: string;
  let customDomain: string;

  beforeEach(async () => {
    await cleanDb();
    mockSend.mockReset();
    const { rawKey } = await createTestApiKey();
    apiKey = rawKey;
    const bucket = await createActiveBucket(apiKey);
    bucketId = bucket.id;
    customDomain = bucket.customDomain;
  });

  function req(path: string, key?: string) {
    return app.request(`/v1/buckets/${bucketId}/files/${path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${key ?? apiKey}` },
    });
  }

  it("returns file metadata", async () => {
    mockSend.mockResolvedValueOnce({
      ContentLength: 1024,
      LastModified: new Date("2024-01-01"),
      ContentType: "image/png",
    });

    const res = await req("images/logo.png");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.key).toBe("images/logo.png");
    expect(json.data.size).toBe(1024);
    expect(json.data.contentType).toBe("image/png");
    expect(json.data.url).toBe(`https://${customDomain}/images/logo.png`);
  });

  it("returns 404 for nonexistent file", async () => {
    const notFound = new Error("NotFound");
    notFound.name = "NotFound";
    mockSend.mockRejectedValueOnce(notFound);

    const res = await req("missing.txt");
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.message).toBe("File not found");
  });

  it("rejects without auth", async () => {
    const res = await app.request(`/v1/buckets/${bucketId}/files/test.txt`, {
      method: "GET",
    });
    expect(res.status).toBe(401);
  });

  it("rejects with insufficient permissions", async () => {
    const { rawKey } = await createTestApiKey({ permissions: ["files:write"] });
    const res = await req("test.txt", rawKey);
    expect(res.status).toBe(403);
  });

  it("returns 404 for nonexistent bucket", async () => {
    const res = await app.request("/v1/buckets/nonexistent/files/test.txt", {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(res.status).toBe(404);
  });
});
