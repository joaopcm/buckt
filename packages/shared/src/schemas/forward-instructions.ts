import { z } from "zod";

export const forwardInstructionsSchema = z.object({
  emails: z.array(z.email("Invalid email address")).min(1, "At least one email required").max(10, "Maximum 10 recipients"),
  bucketId: z.string(),
  serviceId: z.enum(["acm-validation", "cdn-cname"]),
});

export type ForwardInstructionsInput = z.infer<typeof forwardInstructionsSchema>;
