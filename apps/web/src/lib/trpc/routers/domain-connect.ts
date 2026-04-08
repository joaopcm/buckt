import { buckets } from "@buckt/db";
import {
  buildAuthorizationUrl,
  createSignedState,
  discoverDomainConnect,
} from "@buckt/domain-connect";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { env } from "@/env";
import { orgProcedure, protectedProcedure, router } from "../init";

export const domainConnectRouter = router({
  check: protectedProcedure
    .input(z.object({ domain: z.string().min(1) }))
    .query(async ({ input }) => {
      if (!env.DOMAIN_CONNECT_CLIENT_ID) {
        return { supported: false as const };
      }

      const result = await discoverDomainConnect(input.domain);

      if (!result.supported) {
        return { supported: false as const };
      }

      return {
        supported: true as const,
        providerName: result.providerName ?? "your DNS provider",
        providerHost: result.providerHost ?? "",
      };
    }),

  startOAuth: orgProcedure
    .input(z.object({ bucketId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!env.DOMAIN_CONNECT_CLIENT_ID) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Domain Connect is not configured",
        });
      }

      const [bucket] = await ctx.db
        .select()
        .from(buckets)
        .where(
          and(eq(buckets.id, input.bucketId), eq(buckets.orgId, ctx.orgId))
        )
        .limit(1);

      if (!bucket) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bucket not found" });
      }

      if (!bucket.domainConnectProvider) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Bucket does not have Domain Connect support",
        });
      }

      const state = createSignedState(
        { bucketId: bucket.id, orgId: ctx.orgId },
        env.BETTER_AUTH_SECRET
      );

      const redirectUri = `${env.BETTER_AUTH_URL}/api/domain-connect/callback`;

      const authorizationUrl = buildAuthorizationUrl({
        providerHost: bucket.domainConnectProvider,
        domain: bucket.customDomain,
        providerId: env.DOMAIN_CONNECT_PROVIDER_ID,
        serviceId: "cdn-provisioning",
        clientId: env.DOMAIN_CONNECT_CLIENT_ID,
        redirectUri,
        state,
      });

      return { authorizationUrl };
    }),
});
