import { desc, eq } from "drizzle-orm"
import { Hono } from "hono"

import { generateDailyBriefForUser } from "../../briefs/service"
import { db } from "../../db/client"
import { briefs } from "../../db/schema"
import { requireUser } from "../require-user"

export const briefRoutes = new Hono()

briefRoutes.get("/briefs", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const rows = await db.select().from(briefs).where(eq(briefs.userId, user.id)).orderBy(desc(briefs.createdAt)).limit(20)

  return c.json({ briefs: rows })
})

briefRoutes.post("/briefs/generate", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const brief = await generateDailyBriefForUser(user.id)

  if (!brief) {
    return c.json({ error: "No bookmarks available for a brief" }, 400)
  }

  return c.json({ brief }, 201)
})
