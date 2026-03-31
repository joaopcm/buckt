import { Hono } from "hono"
import { serve } from "@hono/node-server"

const app = new Hono()

app.get("/health", (c) => c.json({ status: "ok" }))

serve({ fetch: app.fetch, port: 3001 }, (info) => {
  console.log(`Buckt API running on port ${info.port}`)
})

export default app
