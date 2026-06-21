import { and, desc, eq } from "drizzle-orm"
import { Hono, type Context } from "hono"
import { getCookie } from "hono/cookie"

import { getSessionUser } from "../../auth/session"
import { sessionCookie } from "../../auth/cookies"
import { db } from "../../db/client"
import { syncJobs } from "../../db/schema"
import { syncQueue } from "../../queues/sync"

export const syncRoutes = new Hono()

syncRoutes.post("/sync/x", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const [syncJob] = await db
    .insert(syncJobs)
    .values({ userId: user.id })
    .returning({ id: syncJobs.id, status: syncJobs.status, createdAt: syncJobs.createdAt })

  await syncQueue.add("x.syncBookmarks", { syncJobId: syncJob.id, userId: user.id })

  return c.json({ syncJob }, 202)
})

syncRoutes.get("/sync/jobs", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const jobs = await db
    .select()
    .from(syncJobs)
    .where(eq(syncJobs.userId, user.id))
    .orderBy(desc(syncJobs.createdAt))
    .limit(25)

  return c.json({ jobs })
})

syncRoutes.get("/sync/jobs/:id", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const [job] = await db
    .select()
    .from(syncJobs)
    .where(and(eq(syncJobs.id, c.req.param("id")), eq(syncJobs.userId, user.id)))
    .limit(1)

  if (!job) {
    return c.json({ error: "Sync job not found" }, 404)
  }

  return c.json({ job })
})

async function requireUser(c: Context) {
  const token = getCookie(c, sessionCookie)

  if (!token) {
    return null
  }

  return getSessionUser(token)
}
