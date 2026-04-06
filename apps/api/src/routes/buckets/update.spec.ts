import { beforeEach, describe, expect, it } from "vitest";
import app from "../../app";
import {
  cleanDb,
  createActiveBucket,
  createTestApiKey,
} from "../../lib/test-helpers";

describe("PATCH /v1/buckets/:id", () => {
  let apiKey: string;

  beforeEach(async () => {
    await cleanDb();
    const { rawKey } = await createTestApiKey();
    apiKey = rawKey;
  });

  function req(id: string, body: unknown, key?: string) {
    return app.request(`/v1/buckets/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${key ?? apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  it("renames a bucket", async () => {
    const bucket = await createActiveBucket(apiKey);
    const res = await req(bucket.id, { name: "New Name" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe("New Name");
    expect(json.data.id).toBe(bucket.id);
  });

  it("returns 404 for nonexistent bucket", async () => {
    const res = await req("nonexistent-id", { name: "New Name" });
    expect(res.status).toBe(404);
  });

  it("returns 400 for empty name", async () => {
    const bucket = await createActiveBucket(apiKey);
    const res = await req(bucket.id, { name: "" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing name", async () => {
    const bucket = await createActiveBucket(apiKey);
    const res = await req(bucket.id, {});
    expect(res.status).toBe(400);
  });

  it("returns 401 without auth", async () => {
    const res = await app.request("/v1/buckets/some-id", { method: "PATCH" });
    expect(res.status).toBe(401);
  });

  it("returns 403 with insufficient permissions", async () => {
    const bucket = await createActiveBucket(apiKey);
    const { rawKey } = await createTestApiKey({
      permissions: ["buckets:read"],
    });
    const res = await req(bucket.id, { name: "New Name" }, rawKey);
    expect(res.status).toBe(403);
  });

  it("cannot rename bucket from another org", async () => {
    const bucket = await createActiveBucket(apiKey);
    const { rawKey } = await createTestApiKey({ orgId: "other-org" });
    const res = await req(bucket.id, { name: "Hijack" }, rawKey);
    expect(res.status).toBe(404);
  });
});
