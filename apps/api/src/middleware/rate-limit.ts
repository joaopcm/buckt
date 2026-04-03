import { subscription } from "@buckt/db";
import { PLAN_LIMITS, type PlanName } from "@buckt/shared";
import { and, eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import { db } from "../lib/db";
import { checkRateLimit } from "../lib/rate-limit-store";

export async function rateLimit(c: Context, next: Next) {
  const orgId = c.get("orgId") as string;

  const [sub] = await db
    .select({ plan: subscription.plan })
    .from(subscription)
    .where(
      and(
        eq(subscription.referenceId, orgId),
        eq(subscription.status, "active")
      )
    )
    .limit(1);

  const plan = (sub?.plan ?? "free") as PlanName;
  const limit = PLAN_LIMITS[plan].maxRequestsPerMinute;

  const result = await checkRateLimit(`org:${orgId}`, limit);

  c.header("X-RateLimit-Limit", String(result.limit));
  c.header("X-RateLimit-Remaining", String(result.remaining));
  c.header("X-RateLimit-Reset", String(result.resetAt));

  if (!result.allowed) {
    c.header("Retry-After", "60");
    return c.json(
      { data: null, error: { message: "Rate limit exceeded" }, meta: null },
      429
    );
  }

  await next();
}
