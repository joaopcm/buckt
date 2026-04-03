import { init as sentryInit } from "@sentry/node";
import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "buckt",
  dirs: ["./src/trigger"],
  init: () => {
    const dsn = process.env.SENTRY_DSN;
    if (dsn) {
      sentryInit({ dsn, environment: process.env.NODE_ENV ?? "development" });
    }
  },
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30_000,
      factor: 2,
      randomize: true,
    },
  },
  maxDuration: 3600,
});
