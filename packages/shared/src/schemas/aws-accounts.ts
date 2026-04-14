import { z } from "zod";

export const connectAwsAccountSchema = z.object({
  label: z.string().max(100).optional(),
});

export const updateAwsAccountSchema = z.object({
  roleArn: z
    .string()
    .regex(
      /^arn:aws:iam::\d{12}:role\/.+$/,
      "Must be a valid IAM role ARN (arn:aws:iam::<account-id>:role/<role-name>)"
    )
    .optional(),
  stackId: z.string().optional(),
  label: z.string().max(100).optional(),
});

export const listAwsAccountsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const listS3BucketsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const importBucketsSchema = z.object({
  bucketNames: z.array(z.string().min(1)).min(1).max(50),
});

export const managedSettingsSchema = z.object({
  visibility: z.boolean().optional(),
  cache: z.boolean().optional(),
  cors: z.boolean().optional(),
  lifecycle: z.boolean().optional(),
  optimization: z.boolean().optional(),
});

export type ManagedSettings = z.infer<typeof managedSettingsSchema>;
