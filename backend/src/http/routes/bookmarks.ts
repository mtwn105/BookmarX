import { and, desc, eq, ilike } from "drizzle-orm"
import { Hono } from "hono"

import { db } from "../../db/client"
import { bookmarks, postAuthors, posts } from "../../db/schema"
import { requireUser } from "../require-user"

export const bookmarkRoutes = new Hono()

bookmarkRoutes.get("/bookmarks", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const query = c.req.query("q")
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 100)
  const where = query
    ? and(eq(bookmarks.userId, user.id), ilike(posts.text, `%${query}%`))
    : eq(bookmarks.userId, user.id)

  const rows = await db
    .select({
      bookmark: bookmarks,
      post: posts,
      author: postAuthors,
    })
    .from(bookmarks)
    .innerJoin(posts, eq(bookmarks.postId, posts.id))
    .leftJoin(postAuthors, eq(posts.authorId, postAuthors.id))
    .where(where)
    .orderBy(desc(bookmarks.createdAt))
    .limit(limit)

  return c.json({ bookmarks: rows })
})

bookmarkRoutes.get("/bookmarks/:id", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const [row] = await db
    .select({
      bookmark: bookmarks,
      post: posts,
      author: postAuthors,
    })
    .from(bookmarks)
    .innerJoin(posts, eq(bookmarks.postId, posts.id))
    .leftJoin(postAuthors, eq(posts.authorId, postAuthors.id))
    .where(and(eq(bookmarks.id, c.req.param("id")), eq(bookmarks.userId, user.id)))
    .limit(1)

  if (!row) {
    return c.json({ error: "Bookmark not found" }, 404)
  }

  return c.json(row)
})

bookmarkRoutes.patch("/bookmarks/:id", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const body = (await c.req.json()) as { note?: string | null; status?: "active" | "archived" | "deleted" }
  const [bookmark] = await db
    .update(bookmarks)
    .set({
      note: body.note,
      status: body.status,
      archivedAt: body.status === "archived" ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(bookmarks.id, c.req.param("id")), eq(bookmarks.userId, user.id)))
    .returning()

  if (!bookmark) {
    return c.json({ error: "Bookmark not found" }, 404)
  }

  return c.json({ bookmark })
})
