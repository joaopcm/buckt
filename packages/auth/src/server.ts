import { apiKey } from "@better-auth/api-key";
import { stripe } from "@better-auth/stripe";
import type { Database } from "@buckt/db";
// biome-ignore lint/performance/noNamespaceImport: drizzle requires namespace import for schema
import * as schema from "@buckt/db/src/schema";
import { InviteEmail } from "@buckt/emails";
import { render } from "@react-email/components";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import type { Resend } from "resend";
import Stripe from "stripe";

export function createAuth(
  db: Database,
  env: {
    secret: string;
    baseUrl: string;
    stripeSecretKey: string;
    stripeWebhookSecret: string;
    resend: Resend;
  }
) {
  const stripeClient = new Stripe(env.stripeSecretKey);

  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg", schema }),
    secret: env.secret,
    baseURL: env.baseUrl,
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      organization({
        async sendInvitationEmail(data) {
          const acceptUrl = `${env.baseUrl}/invite/${data.invitation.id}`;
          const html = await render(
            InviteEmail({
              orgName: data.organization.name,
              inviterName: data.inviter.user.name ?? "Someone",
              role: data.invitation.role,
              acceptUrl,
            })
          );

          await env.resend.emails.send({
            from: "Buckt <hi@transactional.buckt.dev>",
            to: data.email,
            subject: `Join ${data.organization.name} on Buckt`,
            html,
          });
        },
      }),
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
              priceId:
                process.env.STRIPE_ENTERPRISE_PRICE_ID || "price_enterprise",
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
  });
}

export type Auth = ReturnType<typeof createAuth>;
