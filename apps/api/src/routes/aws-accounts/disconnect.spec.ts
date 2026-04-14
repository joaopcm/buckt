import { awsAccounts, buckets } from "@buckt/db";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../../app";
import { db } from "../../lib/db";
import {
  cleanDb,
  createTestApiKey,
  insertProSubscription,
} from "../../utils/test-helpers";

describe("DELETE /v1/aws-accounts/:id", () => {
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

  function disconnect(id: string, key?: string) {
    return app.request(`/v1/aws-accounts/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${key ?? apiKey}` },
    });
  }

  it("deletes the aws account", async () => {
    const account = await connect("ToDelete");
    const res = await disconnect(account.id);
    expect(res.status).toBe(204);

    const [row] = await db
      .select()
      .from(awsAccounts)
      .where(eq(awsAccounts.id, account.id));
    expect(row).toBeUndefined();
  });

  it("removes associated buckets from DB", async () => {
    const account = await connect("WithBuckets");

    await db.insert(buckets).values({
      orgId: "test-org-001",
      name: "Imported",
      slug: "imported-test",
      s3BucketName: "imported-test",
      customDomain: "",
      region: "us-east-1",
      awsAccountId: account.id,
      isImported: true,
      managedSettings: {},
      status: "active",
    });

    const res = await disconnect(account.id);
    expect(res.status).toBe(204);

    const remaining = await db
      .select()
      .from(buckets)
      .where(eq(buckets.awsAccountId, account.id));
    expect(remaining).toHaveLength(0);
  });

  it("returns 404 for non-existent account", async () => {
    const res = await disconnect("non-existent-id");
    expect(res.status).toBe(404);
  });

  it("returns 404 for account in another org", async () => {
    const account = await connect("Mine");
    const { rawKey: otherKey } = await createTestApiKey({ orgId: "other-org" });
    const res = await disconnect(account.id, otherKey);
    expect(res.status).toBe(404);
  });
});
