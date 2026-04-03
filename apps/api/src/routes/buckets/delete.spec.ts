import { beforeEach, describe, expect, it } from "vitest";
import app from "../../app";
import { cleanDb, createTestApiKey } from "../../lib/test-helpers";

describe("DELETE /api/buckets/:id", () => {
  let apiKey: string;

  beforeEach(async () => {
    await cleanDb();
    const { rawKey } = await createTestApiKey();
    apiKey = rawKey;
  });

  async function createBucket(name: string, domain: string) {
    const res = await app.request("/api/buckets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, customDomain: domain }),
    });
    const json = await res.json();
    return json.data;
  }

  function deleteBucket(id: string) {
    return app.request(`/api/buckets/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  }

  it("sets bucket status to deleting", async () => {
    const bucket = await createBucket("ToDelete", "delete.test.com");
    const res = await deleteBucket(bucket.id);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("deleting");
  });

  it("rejects deleting an already-deleting bucket", async () => {
    const bucket = await createBucket("ToDelete", "delete2.test.com");
    await deleteBucket(bucket.id);
    const res = await deleteBucket(bucket.id);
    expect(res.status).toBe(409);
  });

  it("returns 404 for non-existent bucket", async () => {
    const res = await deleteBucket("non-existent-id");
    expect(res.status).toBe(404);
  });
});
