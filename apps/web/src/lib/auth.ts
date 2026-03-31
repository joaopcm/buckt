import { createAuth } from "@buckt/auth"
import { createDb } from "@buckt/db"

const db = createDb(process.env.DATABASE_URL!)

export const auth = createAuth(db, {
  secret: process.env.BETTER_AUTH_SECRET!,
  baseUrl: process.env.BETTER_AUTH_URL!,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
})
