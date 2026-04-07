import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSend = vi.fn();

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(() => ({ send: mockSend })),
  ListObjectsV2Command: vi.fn((input: unknown) => input),
}));

vi.mock("../s3", () => ({
  s3: { send: (...args: unknown[]) => mockSend(...args) },
}));

const { getBucketSizeBytes } = await import("./cloudwatch");

describe("getBucketSizeBytes", () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it("sums object sizes from S3 listing", async () => {
    mockSend.mockResolvedValue({
      Contents: [{ Size: 100 }, { Size: 200 }, { Size: 300 }],
      IsTruncated: false,
    });

    const result = await getBucketSizeBytes("my-bucket");
    expect(result).toBe(600);
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it("returns 0 for empty bucket", async () => {
    mockSend.mockResolvedValue({
      Contents: [],
      IsTruncated: false,
    });

    const result = await getBucketSizeBytes("empty-bucket");
    expect(result).toBe(0);
  });

  it("returns 0 when Contents is undefined", async () => {
    mockSend.mockResolvedValue({ IsTruncated: false });

    const result = await getBucketSizeBytes("no-contents");
    expect(result).toBe(0);
  });

  it("paginates through all objects", async () => {
    mockSend
      .mockResolvedValueOnce({
        Contents: [{ Size: 100 }],
        IsTruncated: true,
        NextContinuationToken: "token-1",
      })
      .mockResolvedValueOnce({
        Contents: [{ Size: 200 }],
        IsTruncated: false,
      });

    const result = await getBucketSizeBytes("large-bucket");
    expect(result).toBe(300);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});
