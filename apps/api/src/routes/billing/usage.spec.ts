import { beforeEach, describe, expect, it } from "vitest";
import app from "../../app";
import {
  cleanDb,
  createActiveBucket,
  createTestApiKey,
  insertProSubscription,
} from "../../lib/test-helpers";

describe("GET /api/billing/usage", () => {
  let apiKey: string;

  beforeEach(async () => {
    await cleanDb();
    const { rawKey } = await createTestApiKey();
    apiKey = rawKey;
    await insertProSubscription();
  });

  function getUsage(key?: string) {
    return app.request("/v1/billing/usage", {
      headers: { Authorization: `Bearer ${key ?? apiKey}` },
    });
  }

  it("returns usage for org with buckets", async () => {
    await createActiveBucket(apiKey);
    const res = await getUsage();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveProperty("storage");
    expect(json.data).toHaveProperty("bandwidth");
    expect(json.data.storage).toHaveProperty("usedBytes");
    expect(json.data.storage).toHaveProperty("limitBytes");
    expect(json.data).toHaveProperty("bucketCount");
  });

  it("returns zero usage with no buckets", async () => {
    const res = await getUsage();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.storage.usedBytes).toBe(0);
    expect(json.data.bandwidth.usedBytes).toBe(0);
    expect(json.data.bucketCount.used).toBe(0);
  });

  it("rejects without auth", async () => {
    const res = await app.request("/v1/billing/usage");
    expect(res.status).toBe(401);
  });
});
