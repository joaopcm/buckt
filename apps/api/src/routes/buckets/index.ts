import { Hono } from "hono"
import { requireAuth } from "../../middleware/auth"
import { createBucket } from "./create"
import { listBuckets } from "./list"
import { getBucket } from "./get"
import { deleteBucket } from "./delete"

const app = new Hono()

app.post("/", requireAuth("buckets:write"), createBucket)
app.get("/", requireAuth("buckets:read"), listBuckets)
app.get("/:id", requireAuth("buckets:read"), getBucket)
app.delete("/:id", requireAuth("buckets:delete"), deleteBucket)

export default app
