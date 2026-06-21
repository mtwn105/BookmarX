import { desc, eq } from "drizzle-orm"
import { generateText } from "ai"
import { Hono } from "hono"

import { chatModel } from "../../ai/models"
import { db } from "../../db/client"
import { bookmarks, briefs, postAuthors, posts } from "../../db/schema"
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

  const rows = await db
    .select({ bookmark: bookmarks, post: posts, author: postAuthors })
    .from(bookmarks)
    .innerJoin(posts, eq(bookmarks.postId, posts.id))
    .leftJoin(postAuthors, eq(posts.authorId, postAuthors.id))
    .where(eq(bookmarks.userId, user.id))
    .orderBy(desc(bookmarks.createdAt))
    .limit(16)

  if (rows.length === 0) {
    return c.json({ error: "No bookmarks available for a brief" }, 400)
  }

  const context = rows
    .map((row, index) => {
      const author = row.author ? `@${row.author.username}` : "unknown author"

      return `[${index + 1}] ${author}: ${row.post.text}\nhttps://x.com/i/web/status/${row.post.xPostId}`
    })
    .join("\n\n")
  const result = await generateText({
    model: chatModel,
    system:
      "Create a concise daily brief from saved X bookmarks. Group related ideas, call out missed links or threads, and cite bookmark numbers like [1]. Do not invent anything outside the provided context.",
    prompt: `Create today's BookmarX brief from these bookmarks:\n\n${context}`,
  })
  const [brief] = await db
    .insert(briefs)
    .values({
      userId: user.id,
      title: "Daily bookmark brief",
      content: result.text,
      generatedFor: new Date(),
    })
    .returning()

  return c.json({ brief }, 201)
})
