import { z } from "zod";

export const ORG_ROLES = ["admin", "member"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const createOrgSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be 100 characters or fewer"),
});

export const renameOrgSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export const inviteMemberSchema = z.object({
  email: z.email("Invalid email address"),
  role: z.enum(ORG_ROLES),
});

export const updateRoleSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(ORG_ROLES),
});

export const updateOrgLogoSchema = z.object({
  image: z.string().min(1),
  contentType: z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ]),
});
