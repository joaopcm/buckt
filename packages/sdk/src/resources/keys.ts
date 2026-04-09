import type { HttpClient } from "../http";
import type {
  ApiKey,
  ApiKeyWithSecret,
  CursorMeta,
  Permission,
} from "../types";

export class KeysClient {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async create(opts: {
    name: string;
    permissions: Permission[];
    expiresAt?: Date;
    bucketIds?: string[];
  }): Promise<ApiKeyWithSecret> {
    const { data } = await this.http.post<ApiKeyWithSecret>("/v1/keys", {
      ...opts,
      expiresAt: opts.expiresAt?.toISOString(),
    });
    return data;
  }

  async list(opts?: {
    cursor?: string;
    limit?: number;
  }): Promise<{ data: ApiKey[]; meta: CursorMeta }> {
    const { data, meta } = await this.http.get<ApiKey[]>("/v1/keys", {
      cursor: opts?.cursor,
      limit: opts?.limit?.toString(),
    });
    return { data, meta: meta as CursorMeta };
  }

  async delete(id: string): Promise<void> {
    await this.http.delete(`/v1/keys/${id}`);
  }
}
