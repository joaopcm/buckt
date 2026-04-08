import { Buckt } from "@buckt/sdk";
import { env } from "@/env";

export const buckt = new Buckt({ apiKey: env.BUCKT_API_KEY });
