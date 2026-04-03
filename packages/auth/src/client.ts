import { apiKeyClient } from "@better-auth/api-key/client";
import { stripeClient } from "@better-auth/stripe/client";
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient as createBetterAuthClient } from "better-auth/react";

export function createAuthClient(baseURL: string) {
  return createBetterAuthClient({
    baseURL,
    plugins: [organizationClient(), stripeClient(), apiKeyClient()],
  });
}
