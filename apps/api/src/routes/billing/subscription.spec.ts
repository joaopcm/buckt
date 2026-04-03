import { beforeEach, describe, expect, it } from "vitest";
import app from "../../app";
import {
  cleanDb,
  createTestApiKey,
  insertProSubscription,
} from "../../lib/test-helpers";

describe("GET /api/billing/subscription", () => {
  let apiKey: string;

  beforeEach(async () => {
    await cleanDb();
    const { rawKey } = await createTestApiKey();
    apiKey = rawKey;
  });

  function getSub(key?: string) {
    return app.request("/api/billing/subscription", {
      headers: { Authorization: `Bearer ${key ?? apiKey}` },
    });
  }

  it("returns pro plan when subscribed", async () => {
    await insertProSubscription();
    const res = await getSub();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.plan).toBe("pro");
    expect(json.data.status).toBe("active");
    expect(json.data.limits.maxBuckets).toBe(10);
  });

  it("returns free plan with no subscription", async () => {
    const res = await getSub();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.plan).toBe("free");
    expect(json.data.limits.maxBuckets).toBe(1);
  });

  it("rejects without auth", async () => {
    const res = await app.request("/api/billing/subscription");
    expect(res.status).toBe(401);
  });
});
