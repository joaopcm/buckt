import { buckets } from "@buckt/db";
import {
  buildSignedSyncUrl,
  createSignedState,
  discoverDomainConnect,
  extractDomainParts,
} from "@buckt/domain-connect";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { env } from "@/env";
import { orgProcedure, protectedProcedure, router } from "../init";

const ACM_SUFFIX = ".acm-validations.aws.";

export const domainConnectRouter = router({
  check: protectedProcedure
    .input(z.object({ domain: z.string().min(1) }))
    .query(async ({ input }) => {
      if (!env.DOMAIN_CONNECT_SIGNING_PRIVATE_KEY) {
        return { supported: false as const };
      }

      const result = await discoverDomainConnect(input.domain);

      if (!result.supported) {
        return { supported: false as const };
      }

      const name = result.providerName ?? "your DNS provider";

      return {
        supported: true as const,
        providerName: name.charAt(0).toUpperCase() + name.slice(1),
        providerHost: result.providerHost ?? "",
        mode: result.mode ?? "sync",
      };
    }),

  buildSyncUrl: orgProcedure
    .input(
      z.object({
        bucketId: z.string(),
        serviceId: z.enum(["acm-validation", "cdn-cname"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!env.DOMAIN_CONNECT_SIGNING_PRIVATE_KEY) {
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

      const discovery = await discoverDomainConnect(bucket.customDomain);
      if (!(discovery.supported && discovery.urlSyncUX)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "DNS provider does not support Domain Connect sync flow",
        });
      }

      const { rootDomain, host } = extractDomainParts(bucket.customDomain);
      const dnsRecords = (bucket.dnsRecords ?? []) as Array<{
        name: string;
        type: string;
        value: string;
      }>;

      let variables: Record<string, string>;

      if (input.serviceId === "acm-validation") {
        const certRecord = dnsRecords.find(
          (r) =>
            r.type === "CNAME" && r.value !== "pending-cloudfront-distribution"
        );
        if (!certRecord) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "No certificate validation record found",
          });
        }
        const value = certRecord.value.endsWith(ACM_SUFFIX)
          ? certRecord.value.slice(0, -ACM_SUFFIX.length)
          : certRecord.value;
        variables = {
          certValidationName: certRecord.name,
          certValidationValue: value,
        };
      } else {
        const cnameRecord = dnsRecords.find(
          (r) =>
            r.type === "CNAME" &&
            r.name === bucket.customDomain &&
            r.value !== "pending-cloudfront-distribution"
        );
        if (!cnameRecord) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "CloudFront distribution not ready yet",
          });
        }
        variables = { pointsTo: cnameRecord.value };
      }

      const state = createSignedState(
        { bucketId: bucket.id, orgId: ctx.orgId, serviceId: input.serviceId },
        env.BETTER_AUTH_SECRET
      );

      const redirectUri = `${env.BETTER_AUTH_URL}/api/domain-connect/callback`;

      const syncUrl = buildSignedSyncUrl({
        urlSyncUX: discovery.urlSyncUX,
        providerId: env.DOMAIN_CONNECT_PROVIDER_ID,
        serviceId: input.serviceId,
        domain: rootDomain,
        host,
        redirectUri,
        state,
        variables,
        signingPrivateKey: env.DOMAIN_CONNECT_SIGNING_PRIVATE_KEY,
      });

      return { syncUrl };
    }),
});
