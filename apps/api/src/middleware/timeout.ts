import type { Context, Next } from "hono";

const TIMEOUT_MS = 10_000;

export async function timeout(c: Context, next: Next) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    await Promise.race([
      next(),
      new Promise((_, reject) => {
        controller.signal.addEventListener("abort", () =>
          reject(new Error("Request timeout"))
        );
      }),
    ]);
  } catch (err) {
    if (err instanceof Error && err.message === "Request timeout") {
      return c.json(
        { data: null, error: { message: "Request timeout" }, meta: null },
        408
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
