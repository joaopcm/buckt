import { beforeEach, describe, expect, it } from "vitest";
import app from "../../app";
import {
  cleanDb,
  createTestApiKey,
  insertProSubscription,
} from "../../utils/test-helpers";

describe("GET /v1/aws-accounts/:id", () => {
  let apiKey: string;

  beforeEach(async () => {
    await cleanDb();
    await insertProSubscription();
    const { rawKey } = await createTestApiKey();
    apiKey = rawKey;
  });

  async function connect(label?: string) {
    const res = await app.request("/v1/aws-accounts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ label }),
    });
    const json = await res.json();
    return json.data;
  }

  it("returns account detail", async () => {
    const account = await connect("Detail");

    const res = await app.request(`/v1/aws-accounts/${account.id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe(account.id);
    expect(json.data.label).toBe("Detail");
  });

  it("returns 404 for non-existent account", async () => {
    const res = await app.request("/v1/aws-accounts/non-existent-id", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 for account in another org", async () => {
    const account = await connect("Mine");

    const { rawKey: otherKey } = await createTestApiKey({ orgId: "other-org" });
    const res = await app.request(`/v1/aws-accounts/${account.id}`, {
      headers: { Authorization: `Bearer ${otherKey}` },
    });
    expect(res.status).toBe(404);
  });
});
