import { beforeEach, describe, expect, it } from "vitest";
import app from "../../app";
import {
  cleanDb,
  createTestApiKey,
  insertProSubscription,
} from "../../lib/test-helpers";

describe("GET /api/buckets", () => {
  let apiKey: string;

  beforeEach(async () => {
    await cleanDb();
    await insertProSubscription();
    const { rawKey } = await createTestApiKey();
    apiKey = rawKey;
  });

  function createBucket(name: string, domain: string) {
    return app.request("/api/buckets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, customDomain: domain }),
    });
  }

  function list(query = "", key?: string) {
    return app.request(`/api/buckets${query ? `?${query}` : ""}`, {
      headers: { Authorization: `Bearer ${key ?? apiKey}` },
    });
  }

  it("lists buckets for the org", async () => {
    await createBucket("Bucket A", "a.test.com");
    await createBucket("Bucket B", "b.test.com");

    const res = await list();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(2);
  });

  it("supports cursor-based pagination", async () => {
    for (let i = 0; i < 3; i++) {
      await createBucket(`Bucket ${i}`, `b${i}.test.com`);
    }

    const page1 = await list("limit=2");
    const json1 = await page1.json();
    expect(json1.data).toHaveLength(2);
    expect(json1.meta.nextCursor).toBeTruthy();

    const page2 = await list(`limit=2&cursor=${json1.meta.nextCursor}`);
    const json2 = await page2.json();
    expect(json2.data).toHaveLength(1);
    expect(json2.meta.nextCursor).toBeNull();
  });

  it("filters by status", async () => {
    await createBucket("Active", "active.test.com");

    const res = await list("status=active");
    const json = await res.json();
    expect(json.data).toHaveLength(0);

    const res2 = await list("status=pending");
    const json2 = await res2.json();
    expect(json2.data).toHaveLength(1);
  });

  it("isolates buckets by org", async () => {
    await createBucket("Org1 Bucket", "org1.test.com");

    const { rawKey: otherKey } = await createTestApiKey({ orgId: "other-org" });
    const res = await list("", otherKey);
    const json = await res.json();
    expect(json.data).toHaveLength(0);
  });
});
