import { z } from "zod";

export const PERMISSIONS = [
  "buckets:read",
  "buckets:write",
  "buckets:delete",
  "files:read",
  "files:write",
  "files:delete",
  "keys:read",
  "keys:write",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.enum(PERMISSIONS)).min(1),
  expiresAt: z.coerce.date().optional(),
});
