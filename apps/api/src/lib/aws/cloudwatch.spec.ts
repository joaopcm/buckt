import { describe, it, expect, vi, beforeEach } from "vitest"

const mockSend = vi.fn()

vi.mock("@aws-sdk/client-cloudwatch", () => ({
  CloudWatchClient: vi.fn(() => ({ send: mockSend })),
  GetMetricDataCommand: vi.fn((input: unknown) => input),
}))

const { getBucketSizeBytes } = await import("./cloudwatch")

describe("getBucketSizeBytes", () => {
  beforeEach(() => {
    mockSend.mockReset()
  })

  it("returns the first metric value", async () => {
    mockSend.mockResolvedValue({
      MetricDataResults: [{ Values: [123456789] }],
    })

    const result = await getBucketSizeBytes("my-bucket")
    expect(result).toBe(123456789)
    expect(mockSend).toHaveBeenCalledOnce()
  })

  it("returns 0 when no metric data", async () => {
    mockSend.mockResolvedValue({
      MetricDataResults: [{ Values: [] }],
    })

    const result = await getBucketSizeBytes("empty-bucket")
    expect(result).toBe(0)
  })

  it("returns 0 when MetricDataResults is empty", async () => {
    mockSend.mockResolvedValue({ MetricDataResults: [] })

    const result = await getBucketSizeBytes("no-results")
    expect(result).toBe(0)
  })
})
