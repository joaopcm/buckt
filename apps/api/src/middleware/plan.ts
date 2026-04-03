import { createMiddleware } from "hono/factory"
import { eq, and } from "drizzle-orm"
import { subscription } from "@buckt/db"
import { PLAN_LIMITS, type PlanName } from "@buckt/shared"
import { db } from "../lib/db"

type PlanEnv = {
  Variables: {
    plan: PlanName
    planLimits: (typeof PLAN_LIMITS)[PlanName]
  }
}

export function requirePlan() {
  return createMiddleware<PlanEnv>(async (c, next) => {
    const orgId = c.get("orgId")

    const [sub] = await db
      .select({ plan: subscription.plan })
      .from(subscription)
      .where(
        and(
          eq(subscription.referenceId, orgId),
          eq(subscription.status, "active")
        )
      )
      .limit(1)

    const plan = (sub?.plan ?? "free") as PlanName
    c.set("plan", plan)
    c.set("planLimits", PLAN_LIMITS[plan])

    await next()
  })
}
