import { createAuth } from "@buckt/auth"
import { createDb } from "@buckt/db"
import { env } from "@/env"

const db = createDb(env.DATABASE_URL)

export const auth = createAuth(db, {
  secret: env.BETTER_AUTH_SECRET,
  baseUrl: env.BETTER_AUTH_URL,
  stripeSecretKey: env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
})
