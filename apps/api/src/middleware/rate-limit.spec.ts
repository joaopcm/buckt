import { subscription } from "@buckt/db";
import { beforeEach, describe, expect, it, type Mock } from "vitest";
import app from "../app";
import { db } from "../lib/db";
import { checkRateLimit } from "../lib/rate-limit-store";
import { cleanDb, createTestApiKey, TEST_ORG_ID } from "../lib/test-helpers";

const mockCheckRateLimit = checkRateLimit as Mock;

describe("rate-limit middleware", () => {
  let apiKey: string;

  beforeEach(async () => {
    await cleanDb();
    const { rawKey } = await createTestApiKey();
    apiKey = rawKey;
    mockCheckRateLimit.mockResolvedValue({
      allowed: true,
      limit: 100,
      remaining: 99,
      resetAt: Math.ceil(Date.now() / 1000) + 60,
    });
  });

  it("sets rate limit headers on success", async () => {
    const res = await app.request("/v1/buckets", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("100");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("99");
    expect(res.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("returns 429 when rate limit exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue({
      allowed: false,
      limit: 100,
      remaining: 0,
      resetAt: Math.ceil(Date.now() / 1000) + 60,
    });

    const res = await app.request("/v1/buckets", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    const json = await res.json();
    expect(json.error.message).toBe("Rate limit exceeded");
  });

  it("uses pro limits for active subscriptions", async () => {
    await db.insert(subscription).values({
      id: "sub-rate-1",
      plan: "pro",
      referenceId: TEST_ORG_ID,
      status: "active",
    });

    await app.request("/v1/buckets", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(mockCheckRateLimit).toHaveBeenCalledWith(`org:${TEST_ORG_ID}`, 1000);
  });

  it("uses free limits when no subscription exists", async () => {
    await app.request("/v1/buckets", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(mockCheckRateLimit).toHaveBeenCalledWith(`org:${TEST_ORG_ID}`, 100);
  });

  it("does not rate limit health endpoint", async () => {
    mockCheckRateLimit.mockClear();

    const res = await app.request("/health");

    expect(res.status).toBe(200);
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
  });
});
