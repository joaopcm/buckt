import { captureException } from "@sentry/node";
import type { DrainContext } from "evlog";
import { initLogger } from "evlog";
import { createAxiomDrain } from "evlog/axiom";
import { type EvlogVariables, evlog } from "evlog/hono";
import { createDrainPipeline } from "evlog/pipeline";
import { Hono } from "hono";
import { requestId } from "./lib/request-id";
import { requireAuth } from "./middleware/auth";
import { requirePlan } from "./middleware/plan";
import { rateLimit } from "./middleware/rate-limit";
import { getSubscription } from "./routes/billing/subscription";
import { getUsage } from "./routes/billing/usage";
import { createBucket } from "./routes/buckets/create";
import { deleteBucket } from "./routes/buckets/delete";
import { getBucket } from "./routes/buckets/get";
import { listBuckets } from "./routes/buckets/list";
import { retryBucket } from "./routes/buckets/retry";
import { deleteFile } from "./routes/files/delete";
import { getFile } from "./routes/files/get";
import { listFiles } from "./routes/files/list";
import { uploadFile } from "./routes/files/upload";
import { createKey } from "./routes/keys/create";
import { deleteKey } from "./routes/keys/delete";
import { listKeys } from "./routes/keys/list";

initLogger({ env: { service: "buckt-api" } });

type AppEnv = EvlogVariables & { Variables: { requestId: string } };

const app = new Hono<AppEnv>();

app.use(requestId);

const axiomConfigured = !!process.env.AXIOM_TOKEN;
if (axiomConfigured) {
  const pipeline = createDrainPipeline<DrainContext>({
    batch: { size: 50, intervalMs: 5000 },
    retry: { maxAttempts: 3 },
  });
  app.use(evlog({ drain: pipeline(createAxiomDrain()), exclude: ["/health"] }));
} else {
  app.use(evlog({ exclude: ["/health"] }));
}

app.onError((err, c) => {
  const log = c.get("log");
  log?.error(err);
  captureException(err, {
    extra: {
      requestId: c.get("requestId"),
      path: c.req.path,
      method: c.req.method,
    },
  });
  return c.json(
    { data: null, error: { message: "Internal server error" }, meta: null },
    500
  );
});

app.get("/health", (c) => c.json({ status: "ok" }));

app.post(
  "/v1/buckets",
  requireAuth("buckets:write"),
  rateLimit,
  requirePlan(),
  createBucket
);
app.get("/v1/buckets", requireAuth("buckets:read"), rateLimit, listBuckets);
app.get("/v1/buckets/:id", requireAuth("buckets:read"), rateLimit, getBucket);
app.delete(
  "/v1/buckets/:id",
  requireAuth("buckets:delete"),
  rateLimit,
  deleteBucket
);
app.post(
  "/v1/buckets/:id/retry",
  requireAuth("buckets:write"),
  rateLimit,
  retryBucket
);

app.put(
  "/v1/buckets/:bucketId/files/*",
  requireAuth("files:write"),
  rateLimit,
  requirePlan(),
  uploadFile
);
app.get(
  "/v1/buckets/:bucketId/files",
  requireAuth("files:read"),
  rateLimit,
  listFiles
);
app.get(
  "/v1/buckets/:bucketId/files/*",
  requireAuth("files:read"),
  rateLimit,
  getFile
);
app.delete(
  "/v1/buckets/:bucketId/files/*",
  requireAuth("files:delete"),
  rateLimit,
  deleteFile
);

app.get("/v1/billing/usage", requireAuth(), rateLimit, requirePlan(), getUsage);
app.get("/v1/billing/subscription", requireAuth(), rateLimit, getSubscription);

app.post("/v1/keys", requireAuth("keys:write"), rateLimit, createKey);
app.get("/v1/keys", requireAuth("keys:read"), rateLimit, listKeys);
app.delete("/v1/keys/:id", requireAuth("keys:write"), rateLimit, deleteKey);

export default app;
