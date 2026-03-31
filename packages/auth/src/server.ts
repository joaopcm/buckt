import { betterAuth } from "better-auth"
import { organization } from "better-auth/plugins"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { stripe } from "@better-auth/stripe"
import { apiKey } from "@better-auth/api-key"
import Stripe from "stripe"
import type { Database } from "@buckt/db"
import * as schema from "@buckt/db/src/schema"

export function createAuth(db: Database, env: {
  secret: string
  baseUrl: string
  stripeSecretKey: string
  stripeWebhookSecret: string
}) {
  const stripeClient = new Stripe(env.stripeSecretKey)

  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema }),
    secret: env.secret,
    baseURL: env.baseUrl,
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      organization(),
      stripe({
        stripeClient,
        stripeWebhookSecret: env.stripeWebhookSecret,
        createCustomerOnSignUp: true,
        subscription: {
          enabled: true,
          plans: [
            {
              name: "free",
              priceId: process.env.STRIPE_FREE_PRICE_ID || "price_free",
            },
            {
              name: "pro",
              priceId: process.env.STRIPE_PRO_PRICE_ID || "price_pro",
            },
            {
              name: "enterprise",
              priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || "price_enterprise",
            },
          ],
        },
        organization: {
          enabled: true,
        },
      }),
      apiKey({
        references: "organization",
        defaultPrefix: "bkt",
      }),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>
