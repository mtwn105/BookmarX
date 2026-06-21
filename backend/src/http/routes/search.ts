import { Hono } from "hono"

import { findRelevantBookmarks } from "../../ai/embeddings"
import { requireUser } from "../require-user"

export const searchRoutes = new Hono()

searchRoutes.post("/search/semantic", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const body = (await c.req.json()) as { query?: string; limit?: number }

  if (!body.query?.trim()) {
    return c.json({ error: "Query is required" }, 400)
  }

  const results = await findRelevantBookmarks({
    userId: user.id,
    query: body.query,
    limit: body.limit,
  })

  return c.json({ results })
})
