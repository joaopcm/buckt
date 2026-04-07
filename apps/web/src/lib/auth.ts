import { createAuth } from "@buckt/auth";
import { env } from "@/env";
import { db } from "@/lib/db";
import { resend } from "@/lib/resend";

export const auth = createAuth(db, {
  secret: env.BETTER_AUTH_SECRET,
  baseUrl: env.BETTER_AUTH_URL,
  stripeSecretKey: env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
  resend,
});
