import { subscription } from "@buckt/db";
import { PLAN_LIMITS, type PlanName } from "@buckt/shared";
import { and, eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import { db } from "../lib/db";

export function requirePlan() {
  return async (c: Context, next: Next) => {
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
    c.set("plan", plan);
    c.set("planLimits", PLAN_LIMITS[plan]);

    await next();
  };
}
