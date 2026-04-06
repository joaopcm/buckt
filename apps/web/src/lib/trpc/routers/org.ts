import { subscription } from "@buckt/db";
import type { PlanName } from "@buckt/shared";
import {
  inviteMemberSchema,
  renameOrgSchema,
  updateRoleSchema,
} from "@buckt/shared";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { adminProcedure, orgProcedure, ownerProcedure, router } from "../init";

export const orgRouter = router({
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
});
