import { awsAccounts } from "@buckt/db";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../../app";
import { db } from "../../lib/db";
import {
  cleanDb,
  createTestApiKey,
  insertProSubscription,
} from "../../utils/test-helpers";

describe("POST /v1/aws-accounts/:id/validate", () => {
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

  function validate(id: string, key?: string) {
    return app.request(`/v1/aws-accounts/${id}/validate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key ?? apiKey}` },
    });
  }

  it("rejects validation when roleArn is empty", async () => {
    const account = await connect("NoRole");
    const res = await validate(account.id);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.message).toContain("Role ARN");
  });

  it("returns 404 for non-existent account", async () => {
    const res = await validate("non-existent-id");
    expect(res.status).toBe(404);
  });

  it("returns 404 for account in another org", async () => {
    const account = await connect("Mine");
    await db
      .update(awsAccounts)
      .set({ roleArn: "arn:aws:iam::123456789012:role/BucktAccess" })
      .where(eq(awsAccounts.id, account.id));

    const { rawKey: otherKey } = await createTestApiKey({ orgId: "other-org" });
    const res = await validate(account.id, otherKey);
    expect(res.status).toBe(404);
  });
});
