import { beforeEach, describe, expect, it } from "vitest";
import app from "../../app";
import {
  cleanDb,
  createTestApiKey,
  insertProSubscription,
} from "../../utils/test-helpers";

describe("PATCH /v1/aws-accounts/:id", () => {
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

  function update(id: string, body: unknown, key?: string) {
    return app.request(`/v1/aws-accounts/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${key ?? apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  it("updates label", async () => {
    const account = await connect("Old");
    const res = await update(account.id, { label: "New" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.label).toBe("New");
  });

  it("updates roleArn", async () => {
    const account = await connect("Test");
    const arn = "arn:aws:iam::123456789012:role/BucktAccess";
    const res = await update(account.id, { roleArn: arn });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.roleArn).toBe(arn);
  });

  it("rejects invalid roleArn format", async () => {
    const account = await connect("Test");
    const res = await update(account.id, { roleArn: "not-an-arn" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent account", async () => {
    const res = await update("non-existent-id", { label: "New" });
    expect(res.status).toBe(404);
  });

  it("returns 404 for account in another org", async () => {
    const account = await connect("Mine");
    const { rawKey: otherKey } = await createTestApiKey({ orgId: "other-org" });
    const res = await update(account.id, { label: "Hacked" }, otherKey);
    expect(res.status).toBe(404);
  });
});
