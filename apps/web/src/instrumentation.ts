import { defineNodeInstrumentation } from "evlog/next/instrumentation";

const evlog = defineNodeInstrumentation(() => import("./lib/evlog"));

export async function register() {
  await evlog.register();

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = evlog.onRequestError;
