import { createAuthClient as createBetterAuthClient } from "better-auth/react"
import { organizationClient } from "better-auth/client/plugins"
import { stripeClient } from "@better-auth/stripe/client"
import { apiKeyClient } from "@better-auth/api-key/client"

export function createAuthClient(baseURL: string) {
  return createBetterAuthClient({
    baseURL,
    plugins: [
      organizationClient(),
      stripeClient(),
      apiKeyClient(),
    ],
  })
}
