import { serve } from "@hono/node-server"

import { env } from "./config/env"
import { app } from "./http/app"

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`BookmarX backend listening on http://localhost:${info.port}`)
  },
)
