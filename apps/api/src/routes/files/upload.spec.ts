import { buckets } from "@buckt/db";
import { PLAN_LIMITS } from "@buckt/shared";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../../app";
import { db } from "../../lib/db";
import {
  cleanDb,
  createActiveBucket,
  createTestApiKey,
  insertProSubscription,
} from "../../lib/test-helpers";

vi.mock("../../lib/s3", () => ({
  s3: { send: vi.fn().mockResolvedValue({}) },
}));

describe("PUT /api/buckets/:id/files/*", () => {
  let apiKey: string;
  let bucketId: string;

  beforeEach(async () => {
    await cleanDb();
    const { rawKey } = await createTestApiKey();
    apiKey = rawKey;
    const bucket = await createActiveBucket(apiKey);
    bucketId = bucket.id;
  });

  function req(path: string, body: string, key?: string) {
    return app.request(`/api/buckets/${bucketId}/files/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${key ?? apiKey}`,
        "Content-Type": "text/plain",
      },
      body,
    });
  }

  it("uploads a file", async () => {
    const res = await req("docs/readme.txt", "hello world");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.key).toBe("docs/readme.txt");
    expect(json.data.size).toBe(11);
    expect(json.data.contentType).toBe("text/plain");
  });

  it("rejects without auth", async () => {
    const res = await app.request(`/api/buckets/${bucketId}/files/test.txt`, {
      method: "PUT",
    });
    expect(res.status).toBe(401);
  });

  it("rejects with insufficient permissions", async () => {
    const { rawKey } = await createTestApiKey({ permissions: ["files:read"] });
    const res = await req("test.txt", "data", rawKey);
    expect(res.status).toBe(403);
  });

  it("returns 404 for nonexistent bucket", async () => {
    const res = await app.request("/api/buckets/nonexistent/files/test.txt", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "text/plain",
      },
      body: "data",
    });
    expect(res.status).toBe(404);
  });

  it("rejects upload to inactive bucket", async () => {
    await insertProSubscription();
    const { rawKey } = await createTestApiKey();
    const createRes = await app.request("/api/buckets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${rawKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Pending",
        customDomain: "pending.test.com",
      }),
    });
    const { data } = await createRes.json();

    const res = await app.request(`/api/buckets/${data.id}/files/test.txt`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${rawKey}`,
        "Content-Type": "text/plain",
      },
      body: "data",
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 for bucket in another org", async () => {
    const { rawKey: otherKey } = await createTestApiKey({ orgId: "other-org" });
    const res = await req("file.txt", "data", otherKey);
    expect(res.status).toBe(404);
  });

  it("rejects upload when storage limit exceeded", async () => {
    await db
      .update(buckets)
      .set({ storageUsedBytes: PLAN_LIMITS.free.maxStorageBytes })
      .where(eq(buckets.id, bucketId));

    const res = await req("big-file.txt", "x");
    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.error.message).toContain("Storage limit exceeded");
  });
});
