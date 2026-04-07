import type { HttpClient } from "../http";
import type {
  Bucket,
  BucketStatus,
  BucketVisibility,
  CachePreset,
  CursorMeta,
  OptimizationMode,
} from "../types";

export class BucketsClient {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async create(opts: {
    name: string;
    customDomain: string;
    region?: string;
    visibility?: BucketVisibility;
    cachePreset?: CachePreset;
    corsOrigins?: string[];
    lifecycleTtlDays?: number | null;
    optimizationMode?: OptimizationMode;
  }): Promise<Bucket> {
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

  async update(
    id: string,
    opts: {
      name?: string;
      visibility?: BucketVisibility;
      cachePreset?: CachePreset;
      cacheControlOverride?: string | null;
      corsOrigins?: string[];
      lifecycleTtlDays?: number | null;
      optimizationMode?: OptimizationMode;
    }
  ): Promise<Bucket> {
    const { data } = await this.http.patch<Bucket>(`/v1/buckets/${id}`, opts);
    return data;
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`/v1/buckets/${id}`);
  }
}
