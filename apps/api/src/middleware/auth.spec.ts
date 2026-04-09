import { apiKeys } from "@buckt/db";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../app";
import { db } from "../lib/db";
import { cleanDb, createTestApiKey } from "../utils/test-helpers";

describe("auth middleware", () => {
  beforeEach(async () => {
    await cleanDb();
  });

  it("rejects requests without Authorization header", async () => {
    const res = await app.request("/v1/buckets");
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.message).toBe("Missing API key");
  });

  it("rejects non-Bearer auth", async () => {
    const res = await app.request("/v1/buckets", {
      headers: { Authorization: "Basic abc123" },
    });
    expect(res.status).toBe(401);
  });

  it("rejects keys without bkt_ prefix", async () => {
    const res = await app.request("/v1/buckets", {
      headers: { Authorization: "Bearer invalid_key_here" },
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.message).toBe("Invalid API key format");
  });

  it("rejects non-existent keys", async () => {
    const res = await app.request("/v1/buckets", {
      headers: { Authorization: "Bearer bkt_nonexistentkeyvalue123456" },
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.message).toBe("Invalid API key");
  });

  it("accepts valid API keys", async () => {
    const { rawKey } = await createTestApiKey();
    const res = await app.request("/v1/buckets", {
      headers: { Authorization: `Bearer ${rawKey}` },
    });
    expect(res.status).toBe(200);
  });

  it("rejects expired keys", async () => {
    const { rawKey, apiKey } = await createTestApiKey();

    await db
      .update(apiKeys)
      .set({ expiresAt: new Date("2020-01-01") })
      .where(eq(apiKeys.id, apiKey.id));

    const res = await app.request("/v1/buckets", {
      headers: { Authorization: `Bearer ${rawKey}` },
    });
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.message).toBe("API key expired");
  });

  it("enforces permission checks", async () => {
    const { rawKey } = await createTestApiKey({
      permissions: ["files:read"],
    });
    const res = await app.request("/v1/buckets", {
      headers: { Authorization: `Bearer ${rawKey}` },
    });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.message).toBe("Insufficient permissions");
  });
});
