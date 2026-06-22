import { and, count, desc, eq, sql } from "drizzle-orm"
import { Hono } from "hono"

import { db } from "../../db/client"
import { bookmarks, syncJobs } from "../../db/schema"
import { syncQueue } from "../../queues/sync"
import { requireUser } from "../require-user"

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

syncRoutes.get("/sync/status", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const [latestJob, [library]] = await Promise.all([
    db
      .select()
      .from(syncJobs)
      .where(eq(syncJobs.userId, user.id))
      .orderBy(desc(syncJobs.createdAt))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        total: count(),
        enriched: sql<number>`count(*) filter (where ${bookmarks.aiSummary} is not null)`,
      })
      .from(bookmarks)
      .where(eq(bookmarks.userId, user.id)),
  ])

  return c.json({
    job: latestJob,
    library: {
      total: Number(library?.total ?? 0),
      enriched: Number(library?.enriched ?? 0),
      pending: Math.max(0, Number(library?.total ?? 0) - Number(library?.enriched ?? 0)),
    },
  })
})
