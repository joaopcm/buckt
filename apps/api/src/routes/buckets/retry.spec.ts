import { buckets } from "@buckt/db";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../../app";
import { db } from "../../lib/db";
import { cleanDb, createTestApiKey } from "../../lib/test-helpers";

describe("POST /api/buckets/:id/retry", () => {
  let apiKey: string;

  beforeEach(async () => {
    await cleanDb();
    const { rawKey } = await createTestApiKey();
    apiKey = rawKey;
  });

  async function createBucketWithStatus(
    status: string,
    domain = "retry.test.com"
  ) {
    const res = await app.request("/v1/buckets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Retry Test", customDomain: domain }),
    });
    const json = await res.json();
    const bucket = json.data;

    await db
      .update(buckets)
      .set({ status: status as "failed" | "active" | "pending" })
      .where(eq(buckets.id, bucket.id));

    return bucket;
  }

  function retry(id: string) {
    return app.request(`/v1/buckets/${id}/retry`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  }

  it("retries a failed bucket", async () => {
    const bucket = await createBucketWithStatus("failed");
    const res = await retry(bucket.id);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.status).toBe("pending");
  });

  it("rejects retry on non-failed bucket", async () => {
    const bucket = await createBucketWithStatus("active", "active.test.com");
    const res = await retry(bucket.id);
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent bucket", async () => {
    const res = await retry("non-existent-id");
    expect(res.status).toBe(404);
  });

  it("rejects without auth", async () => {
    const res = await app.request("/v1/buckets/some-id/retry", {
      method: "POST",
    });
    expect(res.status).toBe(401);
  });
});
