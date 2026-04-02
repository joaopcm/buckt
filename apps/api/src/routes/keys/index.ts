import { Hono } from "hono"
import { PERMISSIONS } from "@buckt/shared"
import { requireAuth } from "../../middleware/auth"
import { createKey } from "./create"
import { listKeys } from "./list"
import { deleteKey } from "./delete"

const app = new Hono()

app.post("/", requireAuth(...PERMISSIONS), createKey)
app.get("/", requireAuth(), listKeys)
app.delete("/:id", requireAuth(...PERMISSIONS), deleteKey)

export default app
