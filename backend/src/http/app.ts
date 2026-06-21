import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"

import { env } from "../config/env"
import { aiRoutes } from "./routes/ai"
import { analyticsRoutes } from "./routes/analytics"
import { authRoutes } from "./routes/auth"
import { bookmarkRoutes } from "./routes/bookmarks"
import { briefRoutes } from "./routes/briefs"
import { folderRoutes } from "./routes/folders"
import { searchRoutes } from "./routes/search"
import { syncRoutes } from "./routes/sync"
import { tagRoutes } from "./routes/tags"

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

app.route("/", aiRoutes)
app.route("/", analyticsRoutes)
app.route("/", authRoutes)
app.route("/", bookmarkRoutes)
app.route("/", briefRoutes)
app.route("/", folderRoutes)
app.route("/", searchRoutes)
app.route("/", syncRoutes)
app.route("/", tagRoutes)

app.notFound((c) => c.json({ error: "Not found" }, 404))

app.onError((error, c) => {
  console.error(error)
  return c.json({ error: "Internal server error" }, 500)
})
