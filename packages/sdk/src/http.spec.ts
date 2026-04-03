import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "./errors";
import { HttpClient } from "./http";

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: "Error",
    json: () => Promise.resolve(body),
  });
}

describe("HttpClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends Authorization header", async () => {
    const fetch = mockFetch(200, { data: [], error: null, meta: null });
    vi.stubGlobal("fetch", fetch);

    const client = new HttpClient("https://api.test.com", "bkt_test123");
    await client.get("/api/buckets");

    expect(fetch).toHaveBeenCalledWith(
      "https://api.test.com/api/buckets",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer bkt_test123",
        }),
      })
    );
  });

  it("appends query params for GET", async () => {
    const fetch = mockFetch(200, { data: [], error: null, meta: null });
    vi.stubGlobal("fetch", fetch);

    const client = new HttpClient("https://api.test.com", "bkt_test");
    await client.get("/api/buckets", { status: "active", cursor: undefined });

    const url = fetch.mock.calls[0][0];
    expect(url).toContain("status=active");
    expect(url).not.toContain("cursor");
  });

  it("throws ValidationError on 400", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(400, {
        data: null,
        error: { message: "Bad input" },
        meta: null,
      })
    );
    const client = new HttpClient("https://api.test.com", "bkt_test");
    await expect(client.get("/test")).rejects.toThrow(ValidationError);
  });

  it("throws UnauthorizedError on 401", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(401, {
        data: null,
        error: { message: "Invalid key" },
        meta: null,
      })
    );
    const client = new HttpClient("https://api.test.com", "bkt_test");
    await expect(client.get("/test")).rejects.toThrow(UnauthorizedError);
  });

  it("throws ForbiddenError on 403", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(403, {
        data: null,
        error: { message: "No access" },
        meta: null,
      })
    );
    const client = new HttpClient("https://api.test.com", "bkt_test");
    await expect(client.get("/test")).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError on 404", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(404, {
        data: null,
        error: { message: "Not found" },
        meta: null,
      })
    );
    const client = new HttpClient("https://api.test.com", "bkt_test");
    await expect(client.get("/test")).rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError on 409", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(409, { data: null, error: { message: "Conflict" }, meta: null })
    );
    const client = new HttpClient("https://api.test.com", "bkt_test");
    await expect(client.get("/test")).rejects.toThrow(ConflictError);
  });

  it("sends JSON body for POST", async () => {
    const fetch = mockFetch(201, {
      data: { id: "1" },
      error: null,
      meta: null,
    });
    vi.stubGlobal("fetch", fetch);

    const client = new HttpClient("https://api.test.com", "bkt_test");
    await client.post("/api/buckets", { name: "Test" });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.test.com/api/buckets",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Test" }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });
});
