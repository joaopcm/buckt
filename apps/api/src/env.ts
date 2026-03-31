import { createEnv } from "@t3-oss/env-core"
import { z } from "zod"

const isTest = process.env.NODE_ENV === "test"

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    AWS_ACCESS_KEY_ID: isTest ? z.string().optional() : z.string().min(1),
    AWS_SECRET_ACCESS_KEY: isTest ? z.string().optional() : z.string().min(1),
    AWS_REGION: z.string().default("us-east-1"),
    TRIGGER_SECRET_KEY: isTest ? z.string().optional() : z.string().min(1),
    PORT: z.coerce.number().default(3001),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
