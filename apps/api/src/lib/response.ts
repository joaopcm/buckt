import type { Context } from "hono";

export function success<T>(
  c: Context,
  data: T,
  meta?: Record<string, unknown>
) {
  return c.json({ data, error: null, meta: meta ?? null });
}

export function error(
  c: Context,
  status: 400 | 401 | 402 | 403 | 404 | 409 | 500,
  message: string
) {
  return c.json({ data: null, error: { message }, meta: null }, status);
}
