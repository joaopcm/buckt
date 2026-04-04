import { InfisicalSDK } from "@infisical/sdk";
import { init as sentryInit } from "@sentry/node";
import { syncEnvVars } from "@trigger.dev/build/extensions/core";
import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "proj_zgpmssciifubpxwbkvcx",
  dirs: ["./src/trigger"],
  build: {
    extensions: [
      syncEnvVars(async () => {
        const clientId = process.env.INFISICAL_CLIENT_ID;
        const clientSecret = process.env.INFISICAL_CLIENT_SECRET;
        const projectId = process.env.INFISICAL_PROJECT_ID;
        const siteUrl = process.env.INFISICAL_HOST_URL;

        if (!(clientId && clientSecret && projectId && siteUrl)) {
          return {};
        }

        const client = new InfisicalSDK({ siteUrl });
        await client.auth().universalAuth.login({ clientId, clientSecret });

        const secrets = await client.secrets().listSecrets({
          environment: "prod",
          projectId,
        });

        const env: Record<string, string> = {};
        for (const secret of secrets.secrets) {
          env[secret.secretKey] = secret.secretValue;
        }
        return env;
      }),
    ],
  },
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
