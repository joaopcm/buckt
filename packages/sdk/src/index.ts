import { HttpClient } from "./http"
import { BucketsClient } from "./resources/buckets"
import { FilesClient } from "./resources/files"
import { KeysClient } from "./resources/keys"
import type { BucktOptions } from "./types"

export class Buckt {
  public readonly buckets: BucketsClient
  public readonly files: FilesClient
  public readonly keys: KeysClient

  constructor(opts: BucktOptions) {
    const baseUrl = opts.baseUrl ?? "https://api.buckt.dev"
    const http = new HttpClient(baseUrl, opts.apiKey)

    this.buckets = new BucketsClient(http)
    this.files = new FilesClient(http)
    this.keys = new KeysClient(http)
  }
}

export { BucktError, NotFoundError, ForbiddenError, UnauthorizedError, ValidationError, ConflictError } from "./errors"
export type {
  Bucket,
  BucketStatus,
  ApiKey,
  ApiKeyWithSecret,
  FileInfo,
  Permission,
  CursorMeta,
  BucktOptions,
} from "./types"
