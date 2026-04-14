import type { HttpClient } from "../http";
import type { AwsAccount, Bucket, CursorMeta, S3BucketInfo } from "../types";

export class AwsAccountsClient {
  private readonly http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async connect(opts?: { label?: string }): Promise<AwsAccount> {
    const { data } = await this.http.post<AwsAccount>(
      "/v1/aws-accounts",
      opts ?? {}
    );
    return data;
  }

  async list(opts?: {
    cursor?: string;
    limit?: number;
  }): Promise<{ data: AwsAccount[]; meta: CursorMeta }> {
    const { data, meta } = await this.http.get<AwsAccount[]>(
      "/v1/aws-accounts",
      {
        cursor: opts?.cursor,
        limit: opts?.limit?.toString(),
      }
    );
    return { data, meta: meta as CursorMeta };
  }

  async get(id: string): Promise<AwsAccount> {
    const { data } = await this.http.get<AwsAccount>(`/v1/aws-accounts/${id}`);
    return data;
  }

  async update(
    id: string,
    opts: { roleArn?: string; stackId?: string; label?: string }
  ): Promise<AwsAccount> {
    const { data } = await this.http.patch<AwsAccount>(
      `/v1/aws-accounts/${id}`,
      opts
    );
    return data;
  }

  async validate(id: string): Promise<AwsAccount> {
    const { data } = await this.http.post<AwsAccount>(
      `/v1/aws-accounts/${id}/validate`,
      {}
    );
    return data;
  }

  async disconnect(id: string): Promise<void> {
    await this.http.delete(`/v1/aws-accounts/${id}`);
  }

  async listS3Buckets(
    id: string,
    opts?: { cursor?: string; limit?: number }
  ): Promise<{ data: S3BucketInfo[]; meta: CursorMeta }> {
    const { data, meta } = await this.http.get<S3BucketInfo[]>(
      `/v1/aws-accounts/${id}/s3-buckets`,
      {
        cursor: opts?.cursor,
        limit: opts?.limit?.toString(),
      }
    );
    return { data, meta: meta as CursorMeta };
  }

  async importBuckets(
    id: string,
    opts: { bucketNames: string[] }
  ): Promise<Bucket[]> {
    const { data } = await this.http.post<Bucket[]>(
      `/v1/aws-accounts/${id}/import`,
      opts
    );
    return data;
  }
}
