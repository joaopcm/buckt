import { beforeEach, describe, expect, it } from "vitest";
import app from "../../app";
import { cleanDb, createTestApiKey } from "../../lib/test-helpers";

describe("GET /api/keys", () => {
  let apiKey: string;

  beforeEach(async () => {
    await cleanDb();
    const { rawKey } = await createTestApiKey();
    apiKey = rawKey;
  });

  function createKey(name: string) {
    return app.request("/api/keys", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, permissions: ["buckets:read"] }),
    });
  }

  function list(query = "") {
    return app.request(`/api/keys${query ? `?${query}` : ""}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  }

  it("lists keys for the org", async () => {
    await createKey("Key 1");
    await createKey("Key 2");

    const res = await list();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(3);
  });

  it("supports cursor-based pagination", async () => {
    for (let i = 0; i < 3; i++) {
      await createKey(`Key ${i}`);
    }

    const page1 = await list("limit=2");
    const json1 = await page1.json();
    expect(json1.data).toHaveLength(2);
    expect(json1.meta.nextCursor).toBeTruthy();

    const page2 = await list(`limit=2&cursor=${json1.meta.nextCursor}`);
    const json2 = await page2.json();
    expect(json2.data).toHaveLength(2);
  });
});
