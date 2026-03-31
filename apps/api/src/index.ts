import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { env } from "./env"
import buckets from "./routes/buckets"
import keys from "./routes/keys"

const app = new Hono()

app.get("/health", (c) => c.json({ status: "ok" }))

app.route("/api/buckets", buckets)
app.route("/api/keys", keys)

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Buckt API running on port ${info.port}`)
})

export default app
