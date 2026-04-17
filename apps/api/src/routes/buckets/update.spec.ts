import { awsAccounts, buckets } from "@buckt/db";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../../app";
import { db } from "../../lib/db";
import {
  cleanDb,
  createActiveBucket,
  createTestApiKey,
  TEST_ORG_ID,
} from "../../utils/test-helpers";

vi.mock("../../lib/aws/bucket-settings", () => ({
  setBucketPublic: vi.fn().mockResolvedValue(undefined),
  setBucketPrivate: vi.fn().mockResolvedValue(undefined),
  setBucketCors: vi.fn().mockResolvedValue(undefined),
  setBucketLifecycle: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../lib/aws/client-factory", () => ({
  resolveCredentials: vi.fn().mockResolvedValue(undefined),
}));

describe("PATCH /v1/buckets/:id", () => {
  let apiKey: string;

  beforeEach(async () => {
    await cleanDb();
    const { rawKey } = await createTestApiKey();
    apiKey = rawKey;
  });

  function req(id: string, body: unknown, key?: string) {
    return app.request(`/v1/buckets/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${key ?? apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  it("renames a bucket", async () => {
    const bucket = await createActiveBucket(apiKey);
    const res = await req(bucket.id, { name: "New Name" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe("New Name");
    expect(json.data.id).toBe(bucket.id);
  });

  it("returns 404 for nonexistent bucket", async () => {
    const res = await req("nonexistent-id", { name: "New Name" });
    expect(res.status).toBe(404);
  });

  it("returns 400 for empty name", async () => {
    const bucket = await createActiveBucket(apiKey);
    const res = await req(bucket.id, { name: "" });
    expect(res.status).toBe(400);
  });

  it("returns 200 for empty update (no-op)", async () => {
    const bucket = await createActiveBucket(apiKey);
    const res = await req(bucket.id, {});
    expect(res.status).toBe(200);
  });

  it("returns 401 without auth", async () => {
    const res = await app.request("/v1/buckets/some-id", { method: "PATCH" });
    expect(res.status).toBe(401);
  });

  it("returns 403 with insufficient permissions", async () => {
    const bucket = await createActiveBucket(apiKey);
    const { rawKey } = await createTestApiKey({
      permissions: ["buckets:read"],
    });
    const res = await req(bucket.id, { name: "New Name" }, rawKey);
    expect(res.status).toBe(403);
  });

  it("cannot rename bucket from another org", async () => {
    const bucket = await createActiveBucket(apiKey);
    const { rawKey } = await createTestApiKey({ orgId: "other-org" });
    const res = await req(bucket.id, { name: "Hijack" }, rawKey);
    expect(res.status).toBe(404);
  });

  it("updates visibility", async () => {
    const bucket = await createActiveBucket(apiKey);
    const res = await req(bucket.id, { visibility: "private" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.visibility).toBe("private");
  });

  it("updates cache preset", async () => {
    const bucket = await createActiveBucket(apiKey);
    const res = await req(bucket.id, { cachePreset: "aggressive" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.cachePreset).toBe("aggressive");
  });

  it("updates cache control override", async () => {
    const bucket = await createActiveBucket(apiKey);
    const res = await req(bucket.id, {
      cacheControlOverride: "public, max-age=600",
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.cacheControlOverride).toBe("public, max-age=600");
  });

  it("clears cache control override with null", async () => {
    const bucket = await createActiveBucket(apiKey);
    await req(bucket.id, { cacheControlOverride: "public, max-age=600" });
    const res = await req(bucket.id, { cacheControlOverride: null });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.cacheControlOverride).toBeNull();
  });

  it("updates CORS origins", async () => {
    const bucket = await createActiveBucket(apiKey);
    const res = await req(bucket.id, {
      corsOrigins: ["https://app.test.com", "https://staging.test.com"],
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.corsOrigins).toEqual([
      "https://app.test.com",
      "https://staging.test.com",
    ]);
  });

  it("updates lifecycle TTL", async () => {
    const bucket = await createActiveBucket(apiKey);
    const res = await req(bucket.id, { lifecycleTtlDays: 90 });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.lifecycleTtlDays).toBe(90);
  });

  it("clears lifecycle TTL with null", async () => {
    const bucket = await createActiveBucket(apiKey);
    await req(bucket.id, { lifecycleTtlDays: 30 });
    const res = await req(bucket.id, { lifecycleTtlDays: null });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.lifecycleTtlDays).toBeNull();
  });

  it("updates multiple settings at once", async () => {
    const bucket = await createActiveBucket(apiKey);
    const res = await req(bucket.id, {
      visibility: "private",
      cachePreset: "no-cache",
      lifecycleTtlDays: 7,
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.visibility).toBe("private");
    expect(json.data.cachePreset).toBe("no-cache");
    expect(json.data.lifecycleTtlDays).toBe(7);
  });

  it("rejects invalid CORS origin URL", async () => {
    const bucket = await createActiveBucket(apiKey);
    const res = await req(bucket.id, { corsOrigins: ["not-a-url"] });
    expect(res.status).toBe(400);
  });

  it("rejects lifecycle TTL over 3650", async () => {
    const bucket = await createActiveBucket(apiKey);
    const res = await req(bucket.id, { lifecycleTtlDays: 9999 });
    expect(res.status).toBe(400);
  });

  it("returns 404 for bucket outside scope", async () => {
    const bucket = await createActiveBucket(apiKey);
    const { rawKey: scopedKey } = await createTestApiKey({
      bucketIds: ["other-id"],
    });
    const res = await req(bucket.id, { name: "New Name" }, scopedKey);
    expect(res.status).toBe(404);
  });

  describe("imported bucket managedSettings enforcement", () => {
    async function createImportedBucket(managed: Record<string, boolean>) {
      const [account] = await db
        .insert(awsAccounts)
        .values({
          orgId: TEST_ORG_ID,
          awsAccountId: "123456789012",
          roleArn: "arn:aws:iam::123456789012:role/test",
          externalId: "ext-id",
          status: "active",
        })
        .returning();

      const [bucket] = await db
        .insert(buckets)
        .values({
          orgId: TEST_ORG_ID,
          name: "imported",
          slug: "imported-bucket",
          s3BucketName: "imported-bucket",
          customDomain: "imported.test.com",
          awsAccountId: account.id,
          isImported: true,
          managedSettings: managed,
          status: "active",
        })
        .returning();

      return bucket;
    }

    it("rejects cache preset change when cache is unmanaged", async () => {
      const bucket = await createImportedBucket({ cache: false });
      const res = await req(bucket.id, { cachePreset: "aggressive" });
      expect(res.status).toBe(403);
    });

    it("rejects optimization mode change when optimization is unmanaged", async () => {
      const bucket = await createImportedBucket({ optimization: false });
      const res = await req(bucket.id, { optimizationMode: "balanced" });
      expect(res.status).toBe(403);
    });

    it("rejects cacheControlOverride change when cache is unmanaged", async () => {
      const bucket = await createImportedBucket({ cache: false });
      const res = await req(bucket.id, {
        cacheControlOverride: "public, max-age=60",
      });
      expect(res.status).toBe(403);
    });

    it("allows cache preset change when cache is managed", async () => {
      const bucket = await createImportedBucket({ cache: true });
      const res = await req(bucket.id, { cachePreset: "aggressive" });
      expect(res.status).toBe(200);
      const [updated] = await db
        .select()
        .from(buckets)
        .where(eq(buckets.id, bucket.id));
      expect(updated.cachePreset).toBe("aggressive");
    });

    it("allows name change on imported bucket (not gated)", async () => {
      const bucket = await createImportedBucket({ cache: false });
      const res = await req(bucket.id, { name: "Renamed" });
      expect(res.status).toBe(200);
    });
  });
});
