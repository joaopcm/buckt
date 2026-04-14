import { beforeEach, describe, expect, it } from "vitest";
import app from "../../app";
import {
  cleanDb,
  createTestApiKey,
  insertProSubscription,
  TEST_ORG_ID,
} from "../../utils/test-helpers";

describe("POST /v1/aws-accounts", () => {
  let apiKey: string;

  beforeEach(async () => {
    await cleanDb();
    const { rawKey } = await createTestApiKey();
    apiKey = rawKey;
  });

  function req(body: unknown, key?: string) {
    return app.request("/v1/aws-accounts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key ?? apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  it("creates a pending aws account connection", async () => {
    await insertProSubscription();
    const res = await req({ label: "Production" });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.status).toBe("pending");
    expect(json.data.label).toBe("Production");
    expect(json.data.externalId).toBeTruthy();
    expect(json.data.orgId).toBe(TEST_ORG_ID);
  });

  it("creates without label", async () => {
    await insertProSubscription();
    const res = await req({});
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.label).toBeNull();
  });

  it("rejects free plan users", async () => {
    const res = await req({ label: "Test" });
    expect(res.status).toBe(402);
  });

  it("rejects without auth", async () => {
    const res = await app.request("/v1/aws-accounts", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("rejects with insufficient permissions", async () => {
    await insertProSubscription();
    const { rawKey } = await createTestApiKey({
      permissions: ["aws-accounts:read"],
    });
    const res = await req({ label: "Test" }, rawKey);
    expect(res.status).toBe(403);
  });
});
