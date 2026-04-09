import { beforeEach, describe, expect, it } from "vitest";
import app from "../../app";
import {
  cleanDb,
  createActiveBucket,
  createTestApiKey,
} from "../../lib/test-helpers";

const BKT_PREFIX_RE = /^bkt_/;

describe("POST /api/keys", () => {
  let apiKey: string;

  beforeEach(async () => {
    await cleanDb();
    const { rawKey } = await createTestApiKey();
    apiKey = rawKey;
  });

  function req(body: unknown, key?: string) {
    return app.request("/v1/keys", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key ?? apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  it("creates an API key with specified permissions", async () => {
    const res = await req({
      name: "My Key",
      permissions: ["buckets:read", "files:read"],
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.name).toBe("My Key");
    expect(json.data.key).toMatch(BKT_PREFIX_RE);
    expect(json.data.permissions).toEqual(["buckets:read", "files:read"]);
  });

  it("rejects creation with insufficient permissions", async () => {
    const { rawKey } = await createTestApiKey({
      permissions: ["buckets:read"],
    });
    const res = await req(
      { name: "Sneaky", permissions: ["buckets:read"] },
      rawKey
    );
    expect(res.status).toBe(403);
  });

  it("rejects empty permissions", async () => {
    const res = await req({ name: "No Perms", permissions: [] });
    expect(res.status).toBe(400);
  });

  it("rejects invalid permissions", async () => {
    const res = await req({ name: "Bad Perms", permissions: ["admin:all"] });
    expect(res.status).toBe(400);
  });

  it("creates a key with bucketIds", async () => {
    const bucket = await createActiveBucket(apiKey);
    const res = await req({
      name: "Scoped Key",
      permissions: ["buckets:read"],
      bucketIds: [bucket.id],
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.bucketIds).toEqual([bucket.id]);
  });

  it("rejects invalid bucket IDs", async () => {
    const res = await req({
      name: "Bad Scope",
      permissions: ["buckets:read"],
      bucketIds: ["nonexistent-bucket"],
    });
    expect(res.status).toBe(400);
  });

  it("creates a key without bucketIds (unscoped)", async () => {
    const res = await req({
      name: "Unscoped Key",
      permissions: ["buckets:read"],
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.bucketIds).toBeNull();
  });
});
