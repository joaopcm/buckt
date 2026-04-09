import { buckets } from "@buckt/db";
import { verifySignedState } from "@buckt/domain-connect";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const stateParam = searchParams.get("state");
  const serviceId = searchParams.get("serviceId");
  const error = searchParams.get("error");

  if (!stateParam) {
    return NextResponse.redirect(new URL("/", env.BETTER_AUTH_URL));
  }

  const state = verifySignedState(stateParam, env.BETTER_AUTH_SECRET);
  if (!state) {
    return redirectToBucket(stateParam, "error");
  }

  if (error) {
    return redirectToBucket(stateParam, "error");
  }

  if (serviceId) {
    await markRecordsAsApplied(state.bucketId, serviceId);
  }

  return redirectToBucket(stateParam, "success");
}

async function markRecordsAsApplied(
  bucketId: string,
  serviceId: string
): Promise<void> {
  const [bucket] = await db
    .select({ dnsRecords: buckets.dnsRecords })
    .from(buckets)
    .where(eq(buckets.id, bucketId))
    .limit(1);

  if (!(bucket?.dnsRecords && Array.isArray(bucket.dnsRecords))) {
    return;
  }

  const records = bucket.dnsRecords as Array<{
    name: string;
    type: string;
    value: string;
    applied?: boolean;
  }>;

  const updated = records.map((r) => {
    if (
      serviceId === "acm-validation" &&
      r.value !== "pending-cloudfront-distribution"
    ) {
      return { ...r, applied: true };
    }
    if (
      serviceId === "cdn-cname" &&
      r.name !== r.value &&
      r.value !== "pending-cloudfront-distribution"
    ) {
      return { ...r, applied: true };
    }
    return r;
  });

  await db
    .update(buckets)
    .set({ dnsRecords: updated })
    .where(eq(buckets.id, bucketId));
}

function redirectToBucket(
  stateParam: string,
  result: "success" | "error"
): NextResponse {
  const state = verifySignedState(stateParam, env.BETTER_AUTH_SECRET);

  if (state) {
    return NextResponse.redirect(
      new URL(
        `/org/${state.orgId}/buckets/${state.bucketId}?dc=${result}`,
        env.BETTER_AUTH_URL
      )
    );
  }

  return NextResponse.redirect(new URL("/", env.BETTER_AUTH_URL));
}
