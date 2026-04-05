import { subscription } from "@buckt/db";
import type { PlanName } from "@buckt/shared";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { orgProcedure, router } from "../init";

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
});
