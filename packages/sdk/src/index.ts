import { HttpClient } from "./http";
import { BucketsClient } from "./resources/buckets";
import { FilesClient } from "./resources/files";
import { KeysClient } from "./resources/keys";
import type { BucktOptions } from "./types";

export class Buckt {
  readonly buckets: BucketsClient;
  readonly files: FilesClient;
  readonly keys: KeysClient;

  constructor(opts: BucktOptions) {
    const baseUrl = opts.baseUrl ?? "https://api.buckt.dev";
    const http = new HttpClient(baseUrl, opts.apiKey);

    this.buckets = new BucketsClient(http);
    this.files = new FilesClient(http);
    this.keys = new KeysClient(http);
  }
}

// biome-ignore lint/performance/noBarrelFile: intentional SDK entry point
export {
  BucktError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PaymentRequiredError,
  RateLimitError,
  TimeoutError,
  UnauthorizedError,
  ValidationError,
} from "./errors";
export type {
  ApiKey,
  ApiKeyWithSecret,
  Bucket,
  BucketStatus,
  BucktOptions,
  CursorMeta,
  FileInfo,
  Permission,
} from "./types";
