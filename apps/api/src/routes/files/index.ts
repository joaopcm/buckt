import { Hono } from "hono"
import { requireAuth } from "../../middleware/auth"
import { uploadFile } from "./upload"
import { listFiles } from "./list"
import { getFile } from "./get"
import { deleteFile } from "./delete"

const app = new Hono()

app.put("/:bucketId/files/*", requireAuth("files:write"), uploadFile)
app.get("/:bucketId/files", requireAuth("files:read"), listFiles)
app.get("/:bucketId/files/*", requireAuth("files:read"), getFile)
app.delete("/:bucketId/files/*", requireAuth("files:delete"), deleteFile)

export default app
