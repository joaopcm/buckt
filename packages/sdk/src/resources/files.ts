import type { HttpClient } from "../http";
import type { CursorMeta, FileInfo, OptimizationMode } from "../types";

export class FilesClient {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async upload(
    bucketId: string,
    path: string,
    body: BodyInit,
    contentType?: string,
    options?: { optimization?: OptimizationMode }
  ): Promise<FileInfo> {
    const extraHeaders: Record<string, string> = {};
    if (options?.optimization) {
      extraHeaders["X-Buckt-Optimization"] = options.optimization;
    }
    const { data } = await this.http.put<FileInfo>(
      `/v1/buckets/${bucketId}/files/${path}`,
      body,
      contentType,
      extraHeaders
    );
    return data;
  }

  async list(
    bucketId: string,
    opts?: { prefix?: string; cursor?: string; limit?: number }
  ): Promise<{ data: FileInfo[]; meta: CursorMeta }> {
    const { data, meta } = await this.http.get<FileInfo[]>(
      `/v1/buckets/${bucketId}/files`,
      {
        prefix: opts?.prefix,
        cursor: opts?.cursor,
        limit: opts?.limit?.toString(),
      }
    );
    return { data, meta: meta as CursorMeta };
  }

  async get(bucketId: string, path: string): Promise<FileInfo> {
    const { data } = await this.http.get<FileInfo>(
      `/v1/buckets/${bucketId}/files/${path}`
    );
    return data;
  }

  async delete(bucketId: string, path: string): Promise<void> {
    await this.http.delete(`/v1/buckets/${bucketId}/files/${path}`);
  }
}
