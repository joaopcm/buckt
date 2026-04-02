import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }))

vi.mock("@aws-sdk/client-cloudfront", async () => {
  const actual =
    await vi.importActual<typeof import("@aws-sdk/client-cloudfront")>(
      "@aws-sdk/client-cloudfront"
    )
  return {
    ...actual,
    CloudFrontClient: vi.fn().mockImplementation(() => ({ send: mockSend })),
  }
})

import {
  createDistribution,
  disableDistribution,
  deleteDistribution,
} from "./cloudfront"

beforeEach(() => {
  mockSend.mockReset()
})

describe("createDistribution", () => {
  it("creates distribution and returns ID + domain", async () => {
    mockSend.mockResolvedValueOnce({
      Distribution: {
        Id: "E1234",
        DomainName: "d1234.cloudfront.net",
      },
    })

    const result = await createDistribution({
      domain: "assets.example.com",
      s3WebsiteEndpoint: "bucket.s3-website-us-east-1.amazonaws.com",
      certArn: "arn:aws:acm:us-east-1:123:certificate/abc",
    })

    expect(result.distributionId).toBe("E1234")
    expect(result.distributionDomain).toBe("d1234.cloudfront.net")
    expect(mockSend).toHaveBeenCalledTimes(1)
  })
})

describe("disableDistribution", () => {
  it("disables an enabled distribution", async () => {
    mockSend.mockResolvedValueOnce({
      ETag: "etag-1",
      Distribution: {
        DistributionConfig: { Enabled: true, CallerReference: "ref" },
      },
    })
    mockSend.mockResolvedValueOnce({})

    await disableDistribution("E1234")
    expect(mockSend).toHaveBeenCalledTimes(2)
  })

  it("skips already-disabled distribution", async () => {
    mockSend.mockResolvedValueOnce({
      ETag: "etag-1",
      Distribution: {
        DistributionConfig: { Enabled: false },
      },
    })

    await disableDistribution("E1234")
    expect(mockSend).toHaveBeenCalledTimes(1)
  })
})

describe("deleteDistribution", () => {
  it("deletes distribution with ETag", async () => {
    mockSend.mockResolvedValueOnce({ ETag: "etag-1", Distribution: {} })
    mockSend.mockResolvedValueOnce({})

    await deleteDistribution("E1234")
    expect(mockSend).toHaveBeenCalledTimes(2)
  })
})
