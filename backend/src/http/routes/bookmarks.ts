import { and, asc, desc, eq, gte, ilike, inArray, lte, sql } from "drizzle-orm"
import { Hono } from "hono"

import { db } from "../../db/client"
import {
  bookmarkFolders,
  bookmarkTags,
  bookmarkThreadPosts,
  bookmarks,
  folders,
  postAuthors,
  postMedia,
  postUrls,
  posts,
  tags,
} from "../../db/schema"
import { requireUser } from "../require-user"

export const bookmarkRoutes = new Hono()

bookmarkRoutes.get("/bookmarks", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const query = c.req.query("q")
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 100)
  const folderId = c.req.query("folderId")
  const tagId = c.req.query("tagId")
  const author = c.req.query("author")
  const contentType = c.req.query("contentType")
  const media = c.req.query("media")
  const postedFrom = parseDate(c.req.query("postedFrom"))
  const postedTo = parseDate(c.req.query("postedTo"), true)
  const syncedFrom = parseDate(c.req.query("syncedFrom"))
  const syncedTo = parseDate(c.req.query("syncedTo"), true)
  const sort = c.req.query("sort") === "oldest" ? "oldest" : "newest"
  const conditions = [eq(bookmarks.userId, user.id)]

  if (query) conditions.push(ilike(posts.text, `%${query}%`))
  if (author && author !== "all") conditions.push(eq(postAuthors.username, author))
  if (contentType && contentType !== "all") {
    conditions.push(eq(posts.contentType, contentType as typeof posts.$inferSelect.contentType))
  }
  if (postedFrom) conditions.push(gte(posts.postedAt, postedFrom))
  if (postedTo) conditions.push(lte(posts.postedAt, postedTo))
  if (syncedFrom) conditions.push(gte(bookmarks.createdAt, syncedFrom))
  if (syncedTo) conditions.push(lte(bookmarks.createdAt, syncedTo))
  if (folderId && folderId !== "all") {
    conditions.push(
      sql<boolean>`exists (
        select 1 from ${bookmarkFolders}
        where ${bookmarkFolders.bookmarkId} = ${bookmarks.id}
        and ${bookmarkFolders.folderId} = ${folderId}
      )`,
    )
  }
  if (tagId && tagId !== "all") {
    conditions.push(
      sql<boolean>`exists (
        select 1 from ${bookmarkTags}
        where ${bookmarkTags.bookmarkId} = ${bookmarks.id}
        and ${bookmarkTags.tagId} = ${tagId}
      )`,
    )
  }
  if (media === "with") {
    conditions.push(
      sql<boolean>`exists (
        select 1 from ${postMedia}
        where ${postMedia.postId} = ${posts.id}
      )`,
    )
  }
  if (media === "without") {
    conditions.push(
      sql<boolean>`not exists (
        select 1 from ${postMedia}
        where ${postMedia.postId} = ${posts.id}
      )`,
    )
  }

  const rows = await db
    .select({
      bookmark: bookmarks,
      post: posts,
      author: postAuthors,
    })
    .from(bookmarks)
    .innerJoin(posts, eq(bookmarks.postId, posts.id))
    .leftJoin(postAuthors, eq(posts.authorId, postAuthors.id))
    .where(and(...conditions))
    .orderBy(sort === "oldest" ? asc(posts.postedAt) : desc(posts.postedAt))
    .limit(limit)

  return c.json({ bookmarks: await hydrateBookmarkRows(rows) })
})

bookmarkRoutes.get("/bookmarks/filter-options", async (c) => {
  const user = await requireUser(c)
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const [authorRows, tagRows] = await Promise.all([
    db
      .selectDistinct({
        username: postAuthors.username,
        displayName: postAuthors.displayName,
      })
      .from(bookmarks)
      .innerJoin(posts, eq(bookmarks.postId, posts.id))
      .innerJoin(postAuthors, eq(posts.authorId, postAuthors.id))
      .where(eq(bookmarks.userId, user.id))
      .orderBy(asc(postAuthors.username)),
    db
      .selectDistinct({ id: tags.id, name: tags.name, color: tags.color })
      .from(bookmarkTags)
      .innerJoin(bookmarks, eq(bookmarkTags.bookmarkId, bookmarks.id))
      .innerJoin(tags, eq(bookmarkTags.tagId, tags.id))
      .where(eq(bookmarks.userId, user.id))
      .orderBy(asc(tags.name)),
  ])

  return c.json({ authors: authorRows, tags: tagRows })
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

  const [hydrated] = await hydrateBookmarkRows([row])

  return c.json(hydrated)
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

async function hydrateBookmarkRows(
  rows: Array<{
    bookmark: typeof bookmarks.$inferSelect
    post: typeof posts.$inferSelect
    author: typeof postAuthors.$inferSelect | null
  }>,
) {
  if (rows.length === 0) {
    return []
  }

  const bookmarkIds = rows.map((row) => row.bookmark.id)
  const postIds = rows.map((row) => row.post.id)
  const quotedXPostIds = rows
    .map((row) => getQuotedPostId(row.post.rawJson))
    .filter((id): id is string => Boolean(id))
  const quotedRows =
    quotedXPostIds.length > 0
      ? await db
          .select({ post: posts, author: postAuthors })
          .from(posts)
          .leftJoin(postAuthors, eq(posts.authorId, postAuthors.id))
          .where(inArray(posts.xPostId, quotedXPostIds))
      : []
  const threadRows = await db
    .select({
      bookmarkId: bookmarkThreadPosts.bookmarkId,
      position: bookmarkThreadPosts.position,
      post: posts,
      author: postAuthors,
    })
    .from(bookmarkThreadPosts)
    .innerJoin(posts, eq(bookmarkThreadPosts.postId, posts.id))
    .leftJoin(postAuthors, eq(posts.authorId, postAuthors.id))
    .where(inArray(bookmarkThreadPosts.bookmarkId, bookmarkIds))
    .orderBy(asc(bookmarkThreadPosts.position))
  const allPostIds = [
    ...new Set([
      ...postIds,
      ...quotedRows.map((row) => row.post.id),
      ...threadRows.map((row) => row.post.id),
    ]),
  ]

  const [urlRows, mediaRows, folderRows, tagRows] = await Promise.all([
    db.select().from(postUrls).where(inArray(postUrls.postId, allPostIds)),
    db.select().from(postMedia).where(inArray(postMedia.postId, allPostIds)),
    db
      .select({ bookmarkId: bookmarkFolders.bookmarkId, folder: folders })
      .from(bookmarkFolders)
      .innerJoin(folders, eq(bookmarkFolders.folderId, folders.id))
      .where(inArray(bookmarkFolders.bookmarkId, bookmarkIds)),
    db
      .select({ bookmarkId: bookmarkTags.bookmarkId, tag: tags })
      .from(bookmarkTags)
      .innerJoin(tags, eq(bookmarkTags.tagId, tags.id))
      .where(inArray(bookmarkTags.bookmarkId, bookmarkIds)),
  ])

  const urlsByPostId = groupBy(urlRows, (row) => row.postId)
  const mediaByPostId = groupBy(mediaRows, (row) => row.postId)
  const foldersByBookmarkId = groupBy(folderRows, (row) => row.bookmarkId)
  const tagsByBookmarkId = groupBy(tagRows, (row) => row.bookmarkId)
  const quotedByXPostId = new Map(quotedRows.map((row) => [row.post.xPostId, row]))
  const threadByBookmarkId = groupBy(threadRows, (row) => row.bookmarkId)

  return rows.map((row) => {
    const quotedId = getQuotedPostId(row.post.rawJson)
    const quoted = quotedId ? quotedByXPostId.get(quotedId) : undefined

    return {
      ...row,
      urls: urlsByPostId.get(row.post.id) ?? [],
      media: mediaByPostId.get(row.post.id) ?? [],
      folders: (foldersByBookmarkId.get(row.bookmark.id) ?? []).map((item) => item.folder),
      tags: (tagsByBookmarkId.get(row.bookmark.id) ?? []).map((item) => item.tag),
      quotedPost: quoted
        ? {
            ...quoted,
            urls: urlsByPostId.get(quoted.post.id) ?? [],
            media: mediaByPostId.get(quoted.post.id) ?? [],
          }
        : null,
      threadPosts: (threadByBookmarkId.get(row.bookmark.id) ?? []).map((threadPost) => ({
        post: threadPost.post,
        author: threadPost.author,
        urls: urlsByPostId.get(threadPost.post.id) ?? [],
        media: mediaByPostId.get(threadPost.post.id) ?? [],
      })),
    }
  })
}

function getQuotedPostId(rawJson: Record<string, unknown> | null) {
  const references = rawJson?.referenced_tweets
  if (!Array.isArray(references)) {
    return null
  }

  const quoted = references.find(
    (reference): reference is { type: string; id: string } =>
      typeof reference === "object" &&
      reference !== null &&
      "type" in reference &&
      reference.type === "quoted" &&
      "id" in reference &&
      typeof reference.id === "string",
  )

  return quoted?.id ?? null
}

function groupBy<T, K>(rows: T[], getKey: (row: T) => K) {
  const grouped = new Map<K, T[]>()
  for (const row of rows) {
    const key = getKey(row)
    grouped.set(key, [...(grouped.get(key) ?? []), row])
  }
  return grouped
}

function parseDate(value: string | undefined, endOfDay = false) {
  if (!value) return null
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`)
  return Number.isNaN(date.getTime()) ? null : date
}
