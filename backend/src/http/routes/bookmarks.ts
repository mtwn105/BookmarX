import { and, desc, eq, ilike, inArray } from "drizzle-orm"
import { Hono } from "hono"

import { db } from "../../db/client"
import { bookmarkFolders, bookmarkTags, bookmarks, folders, postAuthors, posts, tags } from "../../db/schema"
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

bookmarkRoutes.post("/bookmarks/bulk", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const body = (await c.req.json()) as {
    bookmarkIds?: string[]
    status?: "active" | "archived" | "deleted"
    addFolderIds?: string[]
    addTagIds?: string[]
  }
  const bookmarkIds = body.bookmarkIds ?? []

  if (bookmarkIds.length === 0) {
    return c.json({ error: "bookmarkIds are required" }, 400)
  }

  const ownedBookmarks = await db
    .select({ id: bookmarks.id })
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, user.id), inArray(bookmarks.id, bookmarkIds)))
  const ownedBookmarkIds = ownedBookmarks.map((bookmark) => bookmark.id)

  if (ownedBookmarkIds.length === 0) {
    return c.json({ updated: 0 })
  }

  if (body.status) {
    await db
      .update(bookmarks)
      .set({ status: body.status, archivedAt: body.status === "archived" ? new Date() : undefined, updatedAt: new Date() })
      .where(and(eq(bookmarks.userId, user.id), inArray(bookmarks.id, ownedBookmarkIds)))
  }

  if (body.addFolderIds?.length) {
    const ownedFolders = await db
      .select({ id: folders.id })
      .from(folders)
      .where(and(eq(folders.userId, user.id), inArray(folders.id, body.addFolderIds)))

    for (const bookmarkId of ownedBookmarkIds) {
      for (const folder of ownedFolders) {
        await db.insert(bookmarkFolders).values({ bookmarkId, folderId: folder.id }).onConflictDoNothing()
      }
    }
  }

  if (body.addTagIds?.length) {
    const ownedTags = await db
      .select({ id: tags.id })
      .from(tags)
      .where(and(eq(tags.userId, user.id), inArray(tags.id, body.addTagIds)))

    for (const bookmarkId of ownedBookmarkIds) {
      for (const tag of ownedTags) {
        await db.insert(bookmarkTags).values({ bookmarkId, tagId: tag.id }).onConflictDoNothing()
      }
    }
  }

  return c.json({ updated: ownedBookmarkIds.length })
})

bookmarkRoutes.post("/bookmarks/:id/folders/:folderId", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const owned = await ensureBookmarkAndFolder(user.id, c.req.param("id"), c.req.param("folderId"))

  if (!owned) {
    return c.json({ error: "Bookmark or folder not found" }, 404)
  }

  await db.insert(bookmarkFolders).values({ bookmarkId: c.req.param("id"), folderId: c.req.param("folderId") }).onConflictDoNothing()

  return c.json({ ok: true })
})

bookmarkRoutes.delete("/bookmarks/:id/folders/:folderId", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  await db
    .delete(bookmarkFolders)
    .where(and(eq(bookmarkFolders.bookmarkId, c.req.param("id")), eq(bookmarkFolders.folderId, c.req.param("folderId"))))

  return c.json({ ok: true })
})

bookmarkRoutes.post("/bookmarks/:id/tags/:tagId", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const owned = await ensureBookmarkAndTag(user.id, c.req.param("id"), c.req.param("tagId"))

  if (!owned) {
    return c.json({ error: "Bookmark or tag not found" }, 404)
  }

  await db.insert(bookmarkTags).values({ bookmarkId: c.req.param("id"), tagId: c.req.param("tagId") }).onConflictDoNothing()

  return c.json({ ok: true })
})

bookmarkRoutes.delete("/bookmarks/:id/tags/:tagId", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  await db.delete(bookmarkTags).where(and(eq(bookmarkTags.bookmarkId, c.req.param("id")), eq(bookmarkTags.tagId, c.req.param("tagId"))))

  return c.json({ ok: true })
})

async function ensureBookmarkAndFolder(userId: string, bookmarkId: string, folderId: string) {
  const [bookmark] = await db.select({ id: bookmarks.id }).from(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.id, bookmarkId))).limit(1)
  const [folder] = await db.select({ id: folders.id }).from(folders).where(and(eq(folders.userId, userId), eq(folders.id, folderId))).limit(1)

  return Boolean(bookmark && folder)
}

async function ensureBookmarkAndTag(userId: string, bookmarkId: string, tagId: string) {
  const [bookmark] = await db.select({ id: bookmarks.id }).from(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.id, bookmarkId))).limit(1)
  const [tag] = await db.select({ id: tags.id }).from(tags).where(and(eq(tags.userId, userId), eq(tags.id, tagId))).limit(1)

  return Boolean(bookmark && tag)
}
