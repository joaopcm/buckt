import {
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
import type { ApiErrorResponse, ApiResponse } from "./types";

export class HttpClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      ...extra,
    };
  }

  private async handleResponse<T>(res: Response): Promise<ApiResponse<T>> {
    const body = (await res.json()) as ApiResponse<T> | ApiErrorResponse;

    if (!res.ok) {
      const message =
        (body as ApiErrorResponse).error?.message ?? res.statusText;
      switch (res.status) {
        case 400:
          throw new ValidationError(message);
        case 401:
          throw new UnauthorizedError(message);
        case 402:
          throw new PaymentRequiredError(message);
        case 403:
          throw new ForbiddenError(message);
        case 404:
          throw new NotFoundError(message);
        case 408:
          throw new TimeoutError(message);
        case 409:
          throw new ConflictError(message);
        case 429:
          throw new RateLimitError(message);
        default:
          throw new BucktError(message, res.status);
      }
    }

    return body as ApiResponse<T>;
  }

  async get<T>(
    path: string,
    params?: Record<string, string | undefined>
  ): Promise<ApiResponse<T>> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) {
          url.searchParams.set(k, v);
        }
      }
    }
    const res = await fetch(url.toString(), { headers: this.headers() });
    return this.handleResponse<T>(res);
  }

  async post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    const res = await fetch(new URL(path, this.baseUrl).toString(), {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(res);
  }

  async put<T>(
    path: string,
    body: BodyInit,
    contentType?: string
  ): Promise<ApiResponse<T>> {
    const res = await fetch(new URL(path, this.baseUrl).toString(), {
      method: "PUT",
      headers: this.headers(
        contentType ? { "Content-Type": contentType } : undefined
      ),
      body,
    });
    return this.handleResponse<T>(res);
  }

  async patch<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    const res = await fetch(new URL(path, this.baseUrl).toString(), {
      method: "PATCH",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
    return this.handleResponse<T>(res);
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    const res = await fetch(new URL(path, this.baseUrl).toString(), {
      method: "DELETE",
      headers: this.headers(),
    });
    return this.handleResponse<T>(res);
  }
}
