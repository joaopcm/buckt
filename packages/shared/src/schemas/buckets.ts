import { z } from "zod"

export const createBucketSchema = z.object({
  name: z.string().min(1).max(100),
  customDomain: z
    .string()
    .min(1)
    .regex(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/, "Invalid domain format"),
})

export const listBucketsSchema = z.object({
  status: z.enum(["pending", "provisioning", "active", "failed", "deleting"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})
