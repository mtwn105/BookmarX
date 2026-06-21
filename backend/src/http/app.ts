import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"

import { env } from "../config/env"

export const app = new Hono()

app.use("*", logger())
app.use(
  "*",
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
)

app.get("/health", (c) => {
  return c.json({
    ok: true,
    service: "bookmarx-backend",
    environment: env.NODE_ENV,
  })
})

app.notFound((c) => c.json({ error: "Not found" }, 404))

app.onError((error, c) => {
  console.error(error)
  return c.json({ error: "Internal server error" }, 500)
})
