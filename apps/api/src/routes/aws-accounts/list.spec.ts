import { beforeEach, describe, expect, it } from "vitest";
import app from "../../app";
import {
  cleanDb,
  createTestApiKey,
  insertProSubscription,
} from "../../utils/test-helpers";

describe("GET /v1/aws-accounts", () => {
  let apiKey: string;

  beforeEach(async () => {
    await cleanDb();
    await insertProSubscription();
    const { rawKey } = await createTestApiKey();
    apiKey = rawKey;
  });

  function connect(label?: string) {
    return app.request("/v1/aws-accounts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ label }),
    });
  }

  function list(query = "", key?: string) {
    return app.request(`/v1/aws-accounts${query ? `?${query}` : ""}`, {
      headers: { Authorization: `Bearer ${key ?? apiKey}` },
    });
  }

  it("lists aws accounts for the org", async () => {
    await connect("Account A");
    await connect("Account B");

    const res = await list();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(2);
  });

  it("returns all statuses", async () => {
    await connect("Pending");

    const res = await list();
    const json = await res.json();
    expect(json.data[0].status).toBe("pending");
  });

  it("supports pagination", async () => {
    for (let i = 0; i < 3; i++) {
      await connect(`Account ${i}`);
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

  it("isolates accounts by org", async () => {
    await connect("Org1 Account");

    const { rawKey: otherKey } = await createTestApiKey({ orgId: "other-org" });
    const res = await list("", otherKey);
    const json = await res.json();
    expect(json.data).toHaveLength(0);
  });
});
