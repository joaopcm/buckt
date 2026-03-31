import { serve } from "@hono/node-server"
import { env } from "./env"
import app from "./app"

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Buckt API running on port ${info.port}`)
})
