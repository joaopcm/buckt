import { Hono } from "hono"
import buckets from "./routes/buckets"
import keys from "./routes/keys"

const app = new Hono()

app.get("/health", (c) => c.json({ status: "ok" }))

app.route("/api/buckets", buckets)
app.route("/api/keys", keys)

export default app
