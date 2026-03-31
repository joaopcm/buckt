import type { HttpClient } from "../http"
import type { ApiKey, ApiKeyWithSecret, Permission, CursorMeta } from "../types"

export class KeysClient {
  constructor(private http: HttpClient) {}

  async create(opts: { name: string; permissions: Permission[]; expiresAt?: Date }): Promise<ApiKeyWithSecret> {
    const { data } = await this.http.post<ApiKeyWithSecret>("/api/keys", {
      ...opts,
      expiresAt: opts.expiresAt?.toISOString(),
    })
    return data
  }

  async list(opts?: { cursor?: string; limit?: number }): Promise<{ data: ApiKey[]; meta: CursorMeta }> {
    const { data, meta } = await this.http.get<ApiKey[]>("/api/keys", {
      cursor: opts?.cursor,
      limit: opts?.limit?.toString(),
    })
    return { data, meta: meta as CursorMeta }
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`/api/keys/${id}`)
  }
}
