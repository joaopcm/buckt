import { auth } from "@/lib/auth";
import { orgProcedure, router } from "../init";

export const orgRouter = router({
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
