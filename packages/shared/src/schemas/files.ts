import { z } from "zod";

export const listFilesSchema = z.object({
  prefix: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(1000).default(100),
});
