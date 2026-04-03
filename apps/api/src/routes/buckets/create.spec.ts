import { beforeEach, describe, expect, it } from "vitest";
import app from "../../app";
import {
  cleanDb,
  createTestApiKey,
  insertProSubscription,
  TEST_ORG_ID,
} from "../../lib/test-helpers";

describe("POST /api/buckets", () => {
  let apiKey: string;

  beforeEach(async () => {
    await cleanDb();
    const { rawKey } = await createTestApiKey();
    apiKey = rawKey;
  });

  function req(body: unknown, key?: string) {
    return app.request("/v1/buckets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key ?? apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  it("creates a bucket", async () => {
    const res = await req({
      name: "Test Bucket",
      customDomain: "assets.test.com",
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.name).toBe("Test Bucket");
    expect(json.data.customDomain).toBe("assets.test.com");
    expect(json.data.status).toBe("pending");
    expect(json.data.orgId).toBe(TEST_ORG_ID);
  });

  it("rejects duplicate domains", async () => {
    await insertProSubscription();
    await req({ name: "First", customDomain: "assets.test.com" });
    const res = await req({ name: "Second", customDomain: "assets.test.com" });
    expect(res.status).toBe(409);
  });

  it("rejects invalid domain format", async () => {
    const res = await req({ name: "Bad", customDomain: "not a domain" });
    expect(res.status).toBe(400);
  });

  it("rejects missing name", async () => {
    const res = await req({ customDomain: "assets.test.com" });
    expect(res.status).toBe(400);
  });

  it("rejects without auth", async () => {
    const res = await app.request("/v1/buckets", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("rejects with insufficient permissions", async () => {
    const { rawKey } = await createTestApiKey({
      permissions: ["buckets:read"],
    });
    const res = await req(
      { name: "Test", customDomain: "assets.test.com" },
      rawKey
    );
    expect(res.status).toBe(403);
  });

  it("rejects when bucket count exceeds free plan limit", async () => {
    await req({ name: "First", customDomain: "first.test.com" });
    const res = await req({ name: "Second", customDomain: "second.test.com" });
    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.error.message).toContain("Plan limit reached");
  });
});
