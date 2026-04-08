import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(1),
    BETTER_AUTH_URL: z.url(),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    STRIPE_FREE_PRICE_ID: z.string().min(1),
    STRIPE_PRO_PRICE_ID: z.string().min(1),
    STRIPE_ENTERPRISE_PRICE_ID: z.string().min(1),
    API_URL: z.url(),
    TRIGGER_SECRET_KEY: z.string().min(1),
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    AWS_REGION: z.string().default("us-east-1"),
    BUCKT_API_KEY: z.string().min(1),
    BUCKT_CDN_BUCKET_ID: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    SENTRY_DSN: z.string().url().optional(),
    AXIOM_TOKEN: z.string().optional(),
    AXIOM_DATASET: z.string().optional().default("buckt-web"),
  },
  client: {
    NEXT_PUBLIC_BETTER_AUTH_URL: z.url(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.url().optional(),
    NEXT_PUBLIC_BUCKT_CDN_URL: z.url(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_BETTER_AUTH_URL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_BUCKT_CDN_URL: process.env.NEXT_PUBLIC_BUCKT_CDN_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
  emptyStringAsUndefined: true,
});
