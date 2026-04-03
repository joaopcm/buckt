import { apiKeys } from "@buckt/db";
import type { Permission } from "@buckt/shared";
import { eq } from "drizzle-orm";
import type { RequestLogger } from "evlog";
import { createMiddleware } from "hono/factory";
import { db } from "../lib/db";
import { hashApiKey } from "../lib/hash";

interface AuthEnv {
  Variables: {
    orgId: string;
    apiKeyId: string;
    permissions: Permission[];
    log: RequestLogger;
  };
}

export function requireAuth(...requiredPermissions: Permission[]) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json(
        { data: null, error: { message: "Missing API key" }, meta: null },
        401
      );
    }

    const rawKey = header.slice(7);
    if (!rawKey.startsWith("bkt_")) {
      return c.json(
        {
          data: null,
          error: { message: "Invalid API key format" },
          meta: null,
        },
        401
      );
    }

    const hashedKey = hashApiKey(rawKey);
    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.hashedKey, hashedKey))
      .limit(1);

    if (!apiKey) {
      return c.json(
        { data: null, error: { message: "Invalid API key" }, meta: null },
        401
      );
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return c.json(
        { data: null, error: { message: "API key expired" }, meta: null },
        401
      );
    }

    const keyPermissions = apiKey.permissions as Permission[];
    if (requiredPermissions.length > 0) {
      const hasPermission = requiredPermissions.every((p) =>
        keyPermissions.includes(p)
      );
      if (!hasPermission) {
        return c.json(
          {
            data: null,
            error: { message: "Insufficient permissions" },
            meta: null,
          },
          403
        );
      }
    }

    db.update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, apiKey.id))
      .then(() => undefined);

    c.set("orgId", apiKey.orgId);
    c.set("apiKeyId", apiKey.id);
    c.set("permissions", keyPermissions);

    const log = c.get("log");
    if (log) {
      log.set({ orgId: apiKey.orgId, apiKeyId: apiKey.id });
    }

    await next();
  });
}
