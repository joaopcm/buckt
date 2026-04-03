import type { HttpClient } from "../http";
import type { Bucket, BucketStatus, CursorMeta } from "../types";

export class BucketsClient {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async create(opts: { name: string; customDomain: string }): Promise<Bucket> {
    const { data } = await this.http.post<Bucket>("/v1/buckets", opts);
    return data;
  }

  async list(opts?: {
    cursor?: string;
    limit?: number;
    status?: BucketStatus;
  }): Promise<{ data: Bucket[]; meta: CursorMeta }> {
    const { data, meta } = await this.http.get<Bucket[]>("/v1/buckets", {
      cursor: opts?.cursor,
      limit: opts?.limit?.toString(),
      status: opts?.status,
    });
    return { data, meta: meta as CursorMeta };
  }

  async get(id: string): Promise<Bucket> {
    const { data } = await this.http.get<Bucket>(`/v1/buckets/${id}`);
    return data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`/v1/buckets/${id}`);
  }
}
