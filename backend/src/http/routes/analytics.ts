import { count, eq, sql } from "drizzle-orm"
import { Hono } from "hono"

import { db } from "../../db/client"
import { bookmarks, briefs, events, postAuthors, posts, syncJobs } from "../../db/schema"
import { requireUser } from "../require-user"

export const analyticsRoutes = new Hono()

analyticsRoutes.get("/analytics/overview", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const [[bookmarkStats], [briefStats], [syncStats], topAuthors] = await Promise.all([
    db.select({ total: count(), archived: sql<number>`count(*) filter (where ${bookmarks.status} = 'archived')` }).from(bookmarks).where(eq(bookmarks.userId, user.id)),
    db.select({ total: count() }).from(briefs).where(eq(briefs.userId, user.id)),
    db.select({ total: count() }).from(syncJobs).where(eq(syncJobs.userId, user.id)),
    db
      .select({ username: postAuthors.username, displayName: postAuthors.displayName, total: count() })
      .from(bookmarks)
      .innerJoin(posts, eq(bookmarks.postId, posts.id))
      .innerJoin(postAuthors, eq(posts.authorId, postAuthors.id))
      .where(eq(bookmarks.userId, user.id))
      .groupBy(postAuthors.username, postAuthors.displayName)
      .orderBy(sql`count(*) desc`)
      .limit(5),
  ])

  return c.json({
    overview: {
      bookmarks: bookmarkStats?.total ?? 0,
      archived: bookmarkStats?.archived ?? 0,
      briefs: briefStats?.total ?? 0,
      syncJobs: syncStats?.total ?? 0,
      topAuthors,
    },
  })
})

analyticsRoutes.post("/events", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const body = (await c.req.json()) as { type?: string; bookmarkId?: string; metadata?: Record<string, unknown> }

  if (!body.type?.trim()) {
    return c.json({ error: "Event type is required" }, 400)
  }

  const [event] = await db
    .insert(events)
    .values({ userId: user.id, type: body.type, bookmarkId: body.bookmarkId, metadata: body.metadata })
    .returning()

  return c.json({ event }, 201)
})
