import { describe, it, expect, beforeEach } from "vitest"
import { subscription } from "@buckt/db"
import app from "../app"
import { TEST_ORG_ID, createTestApiKey, cleanDb } from "../lib/test-helpers"
import { db } from "../lib/db"

describe("plan middleware", () => {
  let apiKey: string

  beforeEach(async () => {
    await cleanDb()
    const { rawKey } = await createTestApiKey()
    apiKey = rawKey
  })

  it("defaults to free when no subscription exists", async () => {
    const res = await app.request("/api/buckets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "First", customDomain: "a.test.com" }),
    })
    expect(res.status).toBe(201)

    const res2 = await app.request("/api/buckets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Second", customDomain: "b.test.com" }),
    })
    expect(res2.status).toBe(402)
  })

  it("sets pro limits when subscription is active", async () => {
    await db.insert(subscription).values({
      id: "sub-test-1",
      plan: "pro",
      referenceId: TEST_ORG_ID,
      status: "active",
    })

    const res = await app.request("/api/buckets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "First", customDomain: "a.test.com" }),
    })
    expect(res.status).toBe(201)

    const res2 = await app.request("/api/buckets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Second", customDomain: "b.test.com" }),
    })
    expect(res2.status).toBe(201)
  })

  it("defaults to free when subscription is canceled", async () => {
    await db.insert(subscription).values({
      id: "sub-test-2",
      plan: "pro",
      referenceId: TEST_ORG_ID,
      status: "canceled",
    })

    const res = await app.request("/api/buckets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "First", customDomain: "a.test.com" }),
    })
    expect(res.status).toBe(201)

    const res2 = await app.request("/api/buckets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Second", customDomain: "b.test.com" }),
    })
    expect(res2.status).toBe(402)
  })
})
