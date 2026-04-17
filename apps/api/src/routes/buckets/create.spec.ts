import { awsAccounts, buckets } from "@buckt/db";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../../app";
import { db } from "../../lib/db";
import {
  cleanDb,
  createTestApiKey,
  insertProSubscription,
  TEST_ORG_ID,
} from "../../utils/test-helpers";

describe("POST /api/buckets", () => {
  let apiKey: string;

  beforeEach(async () => {
    await cleanDb();
    const { rawKey } = await createTestApiKey();
    apiKey = rawKey;
  });

  function req(body: unknown, key?: string) {
    return app.request("/v1/buckets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key ?? apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  it("creates a bucket", async () => {
    const res = await req({
      name: "Test Bucket",
      customDomain: "assets.test.com",
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.name).toBe("Test Bucket");
    expect(json.data.customDomain).toBe("assets.test.com");
    expect(json.data.status).toBe("pending");
    expect(json.data.orgId).toBe(TEST_ORG_ID);
  });

  it("rejects duplicate domains", async () => {
    await insertProSubscription();
    await req({ name: "First", customDomain: "assets.test.com" });
    const res = await req({ name: "Second", customDomain: "assets.test.com" });
    expect(res.status).toBe(409);
  });

  it("rejects invalid domain format", async () => {
    const res = await req({ name: "Bad", customDomain: "not a domain" });
    expect(res.status).toBe(400);
  });

  it("rejects missing name", async () => {
    const res = await req({ customDomain: "assets.test.com" });
    expect(res.status).toBe(400);
  });

  it("rejects without auth", async () => {
    const res = await app.request("/v1/buckets", { method: "POST" });
    expect(res.status).toBe(401);
  });

  it("rejects with insufficient permissions", async () => {
    const { rawKey } = await createTestApiKey({
      permissions: ["buckets:read"],
    });
    const res = await req(
      { name: "Test", customDomain: "assets.test.com" },
      rawKey
    );
    expect(res.status).toBe(403);
  });

  it("rejects when bucket count exceeds free plan limit", async () => {
    await req({ name: "First", customDomain: "first.test.com" });
    const res = await req({ name: "Second", customDomain: "second.test.com" });
    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.error.message).toContain("Plan limit reached");
  });

  it("does not count deleting buckets toward plan limit", async () => {
    const first = await req({
      name: "First",
      customDomain: "first.test.com",
    });
    const firstJson = await first.json();
    await db
      .update(buckets)
      .set({ status: "deleting" })
      .where(eq(buckets.id, firstJson.data.id));

    const res = await req({ name: "Second", customDomain: "second.test.com" });
    expect(res.status).toBe(201);
  });

  it("creates a bucket with custom region", async () => {
    const res = await req({
      name: "EU Bucket",
      customDomain: "eu.test.com",
      region: "eu-west-1",
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.region).toBe("eu-west-1");
  });

  it("defaults region to us-east-1", async () => {
    const res = await req({
      name: "Default Region",
      customDomain: "default.test.com",
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.region).toBe("us-east-1");
  });

  it("rejects invalid region", async () => {
    const res = await req({
      name: "Bad Region",
      customDomain: "bad.test.com",
      region: "us-north-99",
    });
    expect(res.status).toBe(400);
  });

  it("creates a private bucket", async () => {
    const res = await req({
      name: "Private",
      customDomain: "private.test.com",
      visibility: "private",
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.visibility).toBe("private");
  });

  it("creates a bucket with cache preset", async () => {
    const res = await req({
      name: "Cached",
      customDomain: "cached.test.com",
      cachePreset: "aggressive",
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.cachePreset).toBe("aggressive");
  });

  it("creates a bucket with CORS origins", async () => {
    const res = await req({
      name: "CORS",
      customDomain: "cors.test.com",
      corsOrigins: ["https://app.test.com"],
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.corsOrigins).toEqual(["https://app.test.com"]);
  });

  it("creates a bucket with lifecycle TTL", async () => {
    const res = await req({
      name: "Lifecycle",
      customDomain: "lifecycle.test.com",
      lifecycleTtlDays: 30,
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.lifecycleTtlDays).toBe(30);
  });

  it("defaults settings when not specified", async () => {
    const res = await req({
      name: "Defaults",
      customDomain: "defaults.test.com",
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.visibility).toBe("public");
    expect(json.data.cachePreset).toBe("standard");
    expect(json.data.corsOrigins).toEqual([]);
    expect(json.data.lifecycleTtlDays).toBeNull();
  });

  it("generates a lowercase S3 bucket name even with mixed-case orgId", async () => {
    const mixedCaseOrgId = "qnSBsTU6QXyhFuWC";
    const { rawKey } = await createTestApiKey({ orgId: mixedCaseOrgId });
    const res = await app.request("/v1/buckets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${rawKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Mixed Case Test",
        customDomain: "cdn.example.com",
      }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.s3BucketName).toBe("buckt-qnsbstu6-cdn-example-com");
  });

  it("allows scoped keys to create buckets", async () => {
    const { rawKey: scopedKey } = await createTestApiKey({
      bucketIds: ["some-id"],
    });
    const res = await req(
      { name: "Scoped Create", customDomain: "scoped.test.com" },
      scopedKey
    );
    expect(res.status).toBe(201);
  });

  it("rejects BYOA bucket on free plan", async () => {
    const res = await req({
      name: "BYOA",
      customDomain: "byoa.test.com",
      awsAccountId: "some-account-id",
    });
    expect(res.status).toBe(402);
    const json = await res.json();
    expect(json.error.message).toContain("BYOA");
  });

  it("rejects BYOA bucket with non-existent aws account", async () => {
    await insertProSubscription();
    const res = await req({
      name: "BYOA",
      customDomain: "byoa.test.com",
      awsAccountId: "non-existent",
    });
    expect(res.status).toBe(404);
  });

  it("rejects BYOA bucket with non-active aws account", async () => {
    await insertProSubscription();
    const [account] = await db
      .insert(awsAccounts)
      .values({
        orgId: TEST_ORG_ID,
        awsAccountId: "123456789012",
        externalId: "ext-123",
        roleArn: "arn:aws:iam::123456789012:role/BucktAccess",
        status: "pending",
      })
      .returning();

    const res = await req({
      name: "BYOA",
      customDomain: "byoa.test.com",
      awsAccountId: account.id,
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.message).toContain("not active");
  });

  it("creates BYOA bucket with active aws account", async () => {
    await insertProSubscription();
    const [account] = await db
      .insert(awsAccounts)
      .values({
        orgId: TEST_ORG_ID,
        awsAccountId: "123456789012",
        externalId: "ext-123",
        roleArn: "arn:aws:iam::123456789012:role/BucktAccess",
        status: "active",
      })
      .returning();

    const res = await req({
      name: "BYOA Bucket",
      customDomain: "byoa.test.com",
      awsAccountId: account.id,
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.awsAccountId).toBe(account.id);
    expect(json.data.managedSettings).toEqual({
      visibility: true,
      cache: true,
      cors: true,
      lifecycle: true,
      optimization: true,
    });
  });

  it("creates non-BYOA bucket with empty managedSettings", async () => {
    const res = await req({
      name: "Regular",
      customDomain: "regular.test.com",
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.awsAccountId).toBeNull();
    expect(json.data.managedSettings).toEqual({});
  });
});
