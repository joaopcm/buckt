import { z } from "zod";
import { ALLOWED_REGIONS, OPTIMIZATION_MODES } from "../plans";
import { isManagedHostname, MANAGED_DOMAIN_SUFFIX } from "../subdomain";

export const createBucketSchema = z
  .object({
    name: z.string().min(1).max(100),
    isManagedDomain: z.boolean().default(false),
    customDomain: z
      .string()
      .min(1)
      .regex(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/, "Invalid domain format")
      .optional(),
    region: z.enum(ALLOWED_REGIONS).default("us-east-1"),
    visibility: z.enum(["public", "private"]).default("public"),
    cachePreset: z
      .enum(["no-cache", "short", "standard", "aggressive", "immutable"])
      .default("standard"),
    corsOrigins: z
      .array(z.string().url("Invalid origin URL"))
      .max(10, "Maximum 10 CORS origins")
      .default([]),
    lifecycleTtlDays: z
      .number()
      .int()
      .min(1)
      .max(3650)
      .nullable()
      .default(null),
    optimizationMode: z.enum(OPTIMIZATION_MODES).default("none"),
    domainConnectProvider: z.string().optional(),
    awsAccountId: z.string().optional(),
  })
  .superRefine((input, ctx) => {
    if (input.isManagedDomain) {
      if (input.customDomain) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customDomain"],
          message: "customDomain is assigned by the server for managed domains",
        });
      }
      if (input.awsAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["awsAccountId"],
          message: "BYOA requires a custom domain",
        });
      }
      return;
    }
    if (!input.customDomain) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customDomain"],
        message: "customDomain is required",
      });
      return;
    }
    if (isManagedHostname(input.customDomain)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customDomain"],
        message: `customDomain cannot end with .${MANAGED_DOMAIN_SUFFIX}; set isManagedDomain=true to get a managed subdomain`,
      });
    }
  });

export const updateBucketSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  visibility: z.enum(["public", "private"]).optional(),
  cachePreset: z
    .enum(["no-cache", "short", "standard", "aggressive", "immutable"])
    .optional(),
  cacheControlOverride: z.string().max(256).nullable().optional(),
  corsOrigins: z
    .array(z.string().url("Invalid origin URL"))
    .max(10, "Maximum 10 CORS origins")
    .optional(),
  lifecycleTtlDays: z.number().int().min(1).max(3650).nullable().optional(),
  optimizationMode: z.enum(OPTIMIZATION_MODES).optional(),
});

export const listBucketsSchema = z.object({
  status: z
    .enum(["pending", "provisioning", "active", "failed", "deleting"])
    .optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
