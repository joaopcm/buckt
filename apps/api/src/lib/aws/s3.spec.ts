import { describe, it, expect, vi, beforeEach } from "vitest"

const mockSend = vi.fn()

vi.mock("../s3", () => ({
  s3: { send: (...args: unknown[]) => mockSend(...args) },
}))

import {
  createBucketResources,
  emptyBucket,
  deleteBucketResources,
} from "./s3"

beforeEach(() => {
  mockSend.mockReset()
})

describe("createBucketResources", () => {
  it("creates bucket with website hosting and public access", async () => {
    mockSend.mockResolvedValue({})
    const result = await createBucketResources("test-bucket")

    expect(mockSend).toHaveBeenCalledTimes(4)
    expect(result.websiteEndpoint).toBe(
      "test-bucket.s3-website-us-east-1.amazonaws.com"
    )
  })
})

describe("emptyBucket", () => {
  it("deletes all objects with pagination", async () => {
    mockSend
      .mockResolvedValueOnce({
        Contents: [{ Key: "a.txt" }, { Key: "b.txt" }],
        IsTruncated: true,
        NextContinuationToken: "token-1",
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        Contents: [{ Key: "c.txt" }],
        IsTruncated: false,
      })
      .mockResolvedValueOnce({})

    await emptyBucket("test-bucket")
    expect(mockSend).toHaveBeenCalledTimes(4)
  })

  it("handles empty bucket", async () => {
    mockSend.mockResolvedValueOnce({ Contents: undefined, IsTruncated: false })
    await emptyBucket("test-bucket")
    expect(mockSend).toHaveBeenCalledTimes(1)
  })
})

describe("deleteBucketResources", () => {
  it("empties then deletes bucket", async () => {
    mockSend
      .mockResolvedValueOnce({ Contents: undefined, IsTruncated: false })
      .mockResolvedValueOnce({})

    await deleteBucketResources("test-bucket")
    expect(mockSend).toHaveBeenCalledTimes(2)
  })
})
