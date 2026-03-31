import type { HttpClient } from "../http"
import type { Bucket, BucketStatus, CursorMeta } from "../types"

export class BucketsClient {
  constructor(private http: HttpClient) {}

  async create(opts: { name: string; customDomain: string }): Promise<Bucket> {
    const { data } = await this.http.post<Bucket>("/api/buckets", opts)
    return data
  }

  async list(opts?: { cursor?: string; limit?: number; status?: BucketStatus }): Promise<{ data: Bucket[]; meta: CursorMeta }> {
    const { data, meta } = await this.http.get<Bucket[]>("/api/buckets", {
      cursor: opts?.cursor,
      limit: opts?.limit?.toString(),
      status: opts?.status,
    })
    return { data, meta: meta as CursorMeta }
  }

  async get(id: string): Promise<Bucket> {
    const { data } = await this.http.get<Bucket>(`/api/buckets/${id}`)
    return data
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`/api/buckets/${id}`)
  }
}
