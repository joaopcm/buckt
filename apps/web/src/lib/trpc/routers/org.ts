import { z } from "zod";
import { auth } from "@/lib/auth";
import { protectedProcedure, router } from "../init";

export const orgRouter = router({
  get: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      const org = await auth.api.getFullOrganization({
        headers: ctx.headers,
        query: { organizationId: input.orgId },
      });
      return org;
    }),

  members: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await auth.api.listMembers({
        headers: ctx.headers,
        query: { organizationId: input.orgId },
      });
      return result;
    }),
});
