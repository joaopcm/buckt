import { subscription } from "@buckt/db";
import type { PlanName } from "@buckt/shared";
import {
  inviteMemberSchema,
  renameOrgSchema,
  updateOrgLogoSchema,
  updateRoleSchema,
} from "@buckt/shared";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { env } from "@/env";
import { auth } from "@/lib/auth";
import { buckt } from "@/lib/buckt";
import { formatBytes } from "@/lib/format";
import {
  adminProcedure,
  orgProcedure,
  ownerProcedure,
  protectedProcedure,
  router,
} from "../init";

export const orgRouter = router({
  plans: protectedProcedure
    .input(z.object({ orgIds: z.array(z.string()).min(1) }))
    .query(async ({ ctx, input }) => {
      const subs = await ctx.db
        .select({
          orgId: subscription.referenceId,
          plan: subscription.plan,
        })
        .from(subscription)
        .where(
          and(
            inArray(subscription.referenceId, input.orgIds),
            eq(subscription.status, "active")
          )
        );

      const planMap: Record<string, PlanName> = {};
      for (const sub of subs) {
        planMap[sub.orgId] = sub.plan as PlanName;
      }
      return planMap;
    }),

  plan: orgProcedure.query(async ({ ctx }) => {
    const [sub] = await ctx.db
      .select({ plan: subscription.plan })
      .from(subscription)
      .where(
        and(
          eq(subscription.referenceId, ctx.orgId),
          eq(subscription.status, "active")
        )
      )
      .limit(1);

    return (sub?.plan ?? "free") as PlanName;
  }),

  get: orgProcedure.query(async ({ ctx }) => {
    const org = await auth.api.getFullOrganization({
      headers: ctx.headers,
      query: { organizationId: ctx.orgId },
    });
    return org;
  }),

  members: orgProcedure.query(async ({ ctx }) => {
    const result = await auth.api.listMembers({
      headers: ctx.headers,
      query: { organizationId: ctx.orgId },
    });
    return result;
  }),

  invitations: orgProcedure.query(async ({ ctx }) => {
    const result = await auth.api.listInvitations({
      headers: ctx.headers,
      query: { organizationId: ctx.orgId },
    });
    return result;
  }),

  rename: adminProcedure
    .input(renameOrgSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await auth.api.updateOrganization({
        headers: ctx.headers,
        body: {
          data: { name: input.name },
          organizationId: ctx.orgId,
        },
      });
      return result;
    }),

  invite: adminProcedure
    .input(inviteMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await auth.api.createInvitation({
        headers: ctx.headers,
        body: {
          email: input.email,
          role: input.role,
          organizationId: ctx.orgId,
        },
      });
      return result;
    }),

  cancelInvite: adminProcedure
    .input(z.object({ invitationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await auth.api.cancelInvitation({
        headers: ctx.headers,
        body: { invitationId: input.invitationId },
      });
      return result;
    }),

  removeMember: adminProcedure
    .input(z.object({ memberId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await auth.api.removeMember({
        headers: ctx.headers,
        body: {
          memberIdOrEmail: input.memberId,
          organizationId: ctx.orgId,
        },
      });
      return result;
    }),

  updateRole: ownerProcedure
    .input(updateRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await auth.api.updateMemberRole({
        headers: ctx.headers,
        body: {
          memberId: input.memberId,
          role: input.role,
          organizationId: ctx.orgId,
        },
      });
      return result;
    }),

  updateLogo: adminProcedure
    .input(updateOrgLogoSchema)
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.image, "base64");
      const MAX_SIZE = 2 * 1024 * 1024;
      if (buffer.length > MAX_SIZE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Image must be under ${formatBytes(MAX_SIZE)}`,
        });
      }

      const extMap: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
        "image/svg+xml": "svg",
      };
      const ext = extMap[input.contentType] ?? "png";
      const bucketId = env.BUCKT_CDN_BUCKET_ID;

      const [org, cdnBucket] = await Promise.all([
        auth.api.getFullOrganization({
          headers: ctx.headers,
          query: { organizationId: ctx.orgId },
        }),
        buckt.buckets.get(bucketId),
      ]);

      if (org?.logo) {
        try {
          const url = new URL(org.logo);
          if (url.hostname === cdnBucket.customDomain) {
            const oldPath = url.pathname.slice(1);
            await buckt.files.delete(bucketId, oldPath);
          }
        } catch {
          // old file cleanup is best-effort
        }
      }

      const path = `organizations/${ctx.orgId}/avatars/avatar.${ext}`;
      await buckt.files.upload(bucketId, path, buffer, input.contentType);

      const logoUrl = `https://${cdnBucket.customDomain}/${path}?v=${Date.now()}`;
      const result = await auth.api.updateOrganization({
        headers: ctx.headers,
        body: {
          data: { logo: logoUrl },
          organizationId: ctx.orgId,
        },
      });
      return result;
    }),

  removeLogo: adminProcedure.mutation(async ({ ctx }) => {
    const [org, cdnBucket] = await Promise.all([
      auth.api.getFullOrganization({
        headers: ctx.headers,
        query: { organizationId: ctx.orgId },
      }),
      buckt.buckets.get(env.BUCKT_CDN_BUCKET_ID),
    ]);

    if (org?.logo) {
      try {
        const url = new URL(org.logo);
        if (url.hostname === cdnBucket.customDomain) {
          const filePath = url.pathname.slice(1);
          await buckt.files.delete(env.BUCKT_CDN_BUCKET_ID, filePath);
        }
      } catch {
        // file cleanup is best-effort
      }
    }

    const result = await auth.api.updateOrganization({
      headers: ctx.headers,
      body: {
        data: { logo: null },
        organizationId: ctx.orgId,
      },
    });
    return result;
  }),
});
