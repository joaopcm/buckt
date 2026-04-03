import { createAuthClient } from "@buckt/auth";
import { env } from "@/env";

export const authClient = createAuthClient(env.NEXT_PUBLIC_BETTER_AUTH_URL);
