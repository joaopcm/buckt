import { subscription } from "@buckt/db";
import { PLAN_LIMITS, type PlanName } from "@buckt/shared";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { db } from "../../lib/db";
import { success } from "../../utils/response";

export async function getSubscription(c: Context) {
  const orgId = c.get("orgId") as string;

  const [sub] = await db
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.referenceId, orgId),
        eq(subscription.status, "active")
      )
    )
    .limit(1);

  const plan = (sub?.plan ?? "free") as PlanName;

  return success(c, {
    plan,
    status: sub?.status ?? "active",
    limits: PLAN_LIMITS[plan],
    periodStart: sub?.periodStart ?? null,
    periodEnd: sub?.periodEnd ?? null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
  });
}
