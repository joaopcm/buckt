import { timingSafeEqual } from "node:crypto";
import { awsAccounts, buckets } from "@buckt/db";
import { wait } from "@trigger.dev/sdk/v3";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import { env } from "../../env";
import { db } from "../../lib/db";
import { checkRateLimit } from "../../utils/rate-limit-store";
import { error, success } from "../../utils/response";

const WEBHOOK_SECRET_HEADER = "x-buckt-webhook-secret";
const WEBHOOK_IP_RATE_LIMIT_PER_MIN = 120;

interface EventBridgeEnvelope {
  detail?: { Action?: string };
  "detail-type"?: string;
  resources?: string[];
  source?: string;
}

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

function getClientIp(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return (
    c.req.header("cf-connecting-ip") ?? c.req.header("x-real-ip") ?? "unknown"
  );
}

export async function acmWebhook(c: Context) {
  const log = c.get("log");

  const rate = await checkRateLimit(
    `webhook:acm:${getClientIp(c)}`,
    WEBHOOK_IP_RATE_LIMIT_PER_MIN
  );
  if (!rate.allowed) {
    return c.json(
      { data: null, error: { message: "Rate limit exceeded" }, meta: null },
      429
    );
  }

  const body = (await c.req
    .json()
    .catch(() => null)) as EventBridgeEnvelope | null;
  if (!body) {
    return error(c, 400, "Invalid JSON body");
  }

  if (
    body.source !== "aws.acm" ||
    body["detail-type"] !== "ACM Certificate Available" ||
    body.detail?.Action !== "ISSUANCE"
  ) {
    return success(c, { ignored: true });
  }

  const certArn = body.resources?.[0];
  if (!certArn) {
    return success(c, { ignored: true });
  }

  const [bucket] = await db
    .select()
    .from(buckets)
    .where(
      and(eq(buckets.acmCertArn, certArn), eq(buckets.status, "provisioning"))
    )
    .limit(1);

  if (!bucket?.acmWaitTokenId) {
    return success(c, { ignored: true });
  }

  let expectedSecret: string | null = null;
  if (bucket.awsAccountId === null) {
    expectedSecret = env.ACM_WEBHOOK_SECRET;
  } else {
    const [account] = await db
      .select({ secret: awsAccounts.acmWebhookSecret })
      .from(awsAccounts)
      .where(eq(awsAccounts.id, bucket.awsAccountId))
      .limit(1);
    expectedSecret = account?.secret ?? null;
  }

  const providedSecret = c.req.header(WEBHOOK_SECRET_HEADER);
  const authenticated =
    expectedSecret !== null &&
    providedSecret !== undefined &&
    constantTimeEqual(providedSecret, expectedSecret);

  if (!authenticated) {
    log?.warn("ACM webhook auth failed", { bucketId: bucket.id, certArn });
    return success(c, { ignored: true });
  }

  await wait.completeToken(bucket.acmWaitTokenId, { ok: true });

  return success(c, { completed: true });
}
