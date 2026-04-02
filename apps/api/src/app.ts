import { Hono } from "hono"
import { PERMISSIONS } from "@buckt/shared"
import { requireAuth } from "./middleware/auth"
import { createBucket } from "./routes/buckets/create"
import { listBuckets } from "./routes/buckets/list"
import { getBucket } from "./routes/buckets/get"
import { deleteBucket } from "./routes/buckets/delete"
import { retryBucket } from "./routes/buckets/retry"
import { createKey } from "./routes/keys/create"
import { listKeys } from "./routes/keys/list"
import { deleteKey } from "./routes/keys/delete"
import { uploadFile } from "./routes/files/upload"
import { listFiles } from "./routes/files/list"
import { getFile } from "./routes/files/get"
import { deleteFile } from "./routes/files/delete"

const app = new Hono()

app.get("/health", (c) => c.json({ status: "ok" }))

app.post("/api/buckets", requireAuth("buckets:write"), createBucket)
app.get("/api/buckets", requireAuth("buckets:read"), listBuckets)
app.get("/api/buckets/:id", requireAuth("buckets:read"), getBucket)
app.delete("/api/buckets/:id", requireAuth("buckets:delete"), deleteBucket)
app.post("/api/buckets/:id/retry", requireAuth("buckets:write"), retryBucket)

app.put("/api/buckets/:bucketId/files/*", requireAuth("files:write"), uploadFile)
app.get("/api/buckets/:bucketId/files", requireAuth("files:read"), listFiles)
app.get("/api/buckets/:bucketId/files/*", requireAuth("files:read"), getFile)
app.delete("/api/buckets/:bucketId/files/*", requireAuth("files:delete"), deleteFile)

app.post("/api/keys", requireAuth(...PERMISSIONS), createKey)
app.get("/api/keys", requireAuth(), listKeys)
app.delete("/api/keys/:id", requireAuth(...PERMISSIONS), deleteKey)

export default app
