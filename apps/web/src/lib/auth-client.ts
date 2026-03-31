import { createAuthClient } from "@buckt/auth"

export const authClient = createAuthClient(process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000")
