import type { HttpClient } from "../http"
import type { FileInfo, CursorMeta } from "../types"

export class FilesClient {
  constructor(private http: HttpClient) {}

  async upload(bucketId: string, path: string, body: BodyInit, contentType?: string): Promise<FileInfo> {
    const { data } = await this.http.put<FileInfo>(`/api/buckets/${bucketId}/files/${path}`, body, contentType)
    return data
  }

  async list(bucketId: string, opts?: { prefix?: string; cursor?: string; limit?: number }): Promise<{ data: FileInfo[]; meta: CursorMeta }> {
    const { data, meta } = await this.http.get<FileInfo[]>(`/api/buckets/${bucketId}/files`, {
      prefix: opts?.prefix,
      cursor: opts?.cursor,
      limit: opts?.limit?.toString(),
    })
    return { data, meta: meta as CursorMeta }
  }

  async get(bucketId: string, path: string): Promise<FileInfo> {
    const { data } = await this.http.get<FileInfo>(`/api/buckets/${bucketId}/files/${path}`)
    return data
  }

  async delete(bucketId: string, path: string): Promise<void> {
    await this.http.delete(`/api/buckets/${bucketId}/files/${path}`)
  }
}
