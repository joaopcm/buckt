import { init } from "@sentry/node";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 1.0,
  });
}
