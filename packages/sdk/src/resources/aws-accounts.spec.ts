import { beforeEach, describe, expect, it, vi } from "vitest";
import { Buckt } from "../index";

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    json: () => Promise.resolve(body),
  });
}

describe("AwsAccountsClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const client = new Buckt({
    apiKey: "bkt_test",
    baseUrl: "https://api.test.com",
  });

  it("connects an aws account", async () => {
    const account = {
      id: "1",
      status: "pending",
      externalId: "ext-123",
      label: "Production",
    };
    vi.stubGlobal(
      "fetch",
      mockFetch(201, { data: account, error: null, meta: null })
    );

    const result = await client.awsAccounts.connect({ label: "Production" });
    expect(result.id).toBe("1");
    expect(result.status).toBe("pending");
    expect(result.externalId).toBe("ext-123");
  });

  it("lists aws accounts with pagination", async () => {
    const accounts = [{ id: "1" }, { id: "2" }];
    const meta = { nextCursor: "2", limit: 20 };
    vi.stubGlobal(
      "fetch",
      mockFetch(200, { data: accounts, error: null, meta })
    );

    const result = await client.awsAccounts.list({ limit: 20 });
    expect(result.data).toHaveLength(2);
    expect(result.meta.nextCursor).toBe("2");
  });

  it("gets an aws account by id", async () => {
    const account = { id: "1", label: "Production", status: "active" };
    vi.stubGlobal(
      "fetch",
      mockFetch(200, { data: account, error: null, meta: null })
    );

    const result = await client.awsAccounts.get("1");
    expect(result.id).toBe("1");
    expect(result.status).toBe("active");
  });

  it("updates an aws account", async () => {
    const account = {
      id: "1",
      roleArn: "arn:aws:iam::123456789012:role/BucktAccess",
      label: "Updated",
    };
    vi.stubGlobal(
      "fetch",
      mockFetch(200, { data: account, error: null, meta: null })
    );

    const result = await client.awsAccounts.update("1", {
      roleArn: "arn:aws:iam::123456789012:role/BucktAccess",
      label: "Updated",
    });
    expect(result.label).toBe("Updated");
    expect(result.roleArn).toBe("arn:aws:iam::123456789012:role/BucktAccess");
  });

  it("validates an aws account", async () => {
    const account = { id: "1", status: "active" };
    vi.stubGlobal(
      "fetch",
      mockFetch(200, { data: account, error: null, meta: null })
    );

    const result = await client.awsAccounts.validate("1");
    expect(result.status).toBe("active");
  });

  it("disconnects an aws account", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(204, { data: null, error: null, meta: null })
    );

    await expect(client.awsAccounts.disconnect("1")).resolves.toBeUndefined();
  });

  it("lists s3 buckets in an account", async () => {
    const s3Buckets = [
      { name: "my-bucket", creationDate: "2024-01-01T00:00:00Z" },
      { name: "other-bucket", creationDate: "2024-06-01T00:00:00Z" },
    ];
    const meta = { nextCursor: null, limit: 20 };
    vi.stubGlobal(
      "fetch",
      mockFetch(200, { data: s3Buckets, error: null, meta })
    );

    const result = await client.awsAccounts.listS3Buckets("1", { limit: 20 });
    expect(result.data).toHaveLength(2);
    expect(result.data[0].name).toBe("my-bucket");
  });

  it("imports buckets from an account", async () => {
    const imported = [
      { id: "b1", name: "my-bucket", isImported: true, status: "active" },
    ];
    vi.stubGlobal(
      "fetch",
      mockFetch(201, { data: imported, error: null, meta: null })
    );

    const result = await client.awsAccounts.importBuckets("1", {
      bucketNames: ["my-bucket"],
    });
    expect(result).toHaveLength(1);
    expect(result[0].isImported).toBe(true);
  });
});
