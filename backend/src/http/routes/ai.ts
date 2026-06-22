import { generateText, streamText } from "ai"
import { and, eq } from "drizzle-orm"
import { Hono } from "hono"

import { findRelevantBookmarks } from "../../ai/embeddings"
import { chatModel } from "../../ai/models"
import { db } from "../../db/client"
import { bookmarkTags, bookmarks, postAuthors, posts, tags } from "../../db/schema"
import { requireUser } from "../require-user"

export const aiRoutes = new Hono()

aiRoutes.post("/ai/chat", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const body = (await c.req.json()) as {
    question?: string
    messages?: Array<{ role: "user" | "assistant"; content: string }>
  }
  const question = body.question?.trim() || body.messages?.at(-1)?.content.trim()

  if (!question) {
    return c.json({ error: "Question is required" }, 400)
  }

  const sources = await findRelevantBookmarks({ userId: user.id, query: question, limit: 8 })

  if (sources.length === 0) {
    return c.json({
      answer: "I could not find enough matching saved bookmarks to answer that.",
      sources,
    })
  }

  const context = sources
    .map((source, index) => {
      const author = source.authorUsername ? `@${source.authorUsername}` : "unknown author"

      return `[${index + 1}] ${author}\nPost: ${source.postText}\nRelevant chunk: ${source.chunk}\nX URL: https://x.com/i/web/status/${source.xPostId}`
    })
    .join("\n\n")
  const result = await generateText({
    model: chatModel,
    system:
      "You answer questions using only the provided X bookmark context. Do not invent bookmarks or facts. If context is weak, say so. Include bracket citations like [1] for every specific claim.",
    prompt: `${formatConversation(body.messages, question)}\n\nSaved bookmark context:\n${context}`,
  })

  return c.json({
    answer: result.text,
    sources,
  })
})

aiRoutes.post("/ai/chat/stream", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const body = (await c.req.json()) as {
    question?: string
    messages?: Array<{ role: "user" | "assistant"; content: string }>
  }
  const question = body.question?.trim() || body.messages?.at(-1)?.content.trim()

  if (!question) {
    return c.json({ error: "Question is required" }, 400)
  }

  const sources = await findRelevantBookmarks({ userId: user.id, query: question, limit: 8 })

  const context = sources.length > 0
    ? sources
        .map((source, index) => {
          const author = source.authorUsername ? `@${source.authorUsername}` : "unknown author"
          return `[${index + 1}] ${author}\nPost: ${source.postText}\nRelevant chunk: ${source.chunk}\nX URL: https://x.com/i/web/status/${source.xPostId}`
        })
        .join("\n\n")
    : "No matching bookmarks found."

  const result = streamText({
    model: chatModel,
    system:
      "You answer questions using only the provided X bookmark context. Do not invent bookmarks or facts. If context is weak, say so. Include bracket citations like [1] for every specific claim.",
    prompt: `${formatConversation(body.messages, question)}\n\nSaved bookmark context:\n${context}`,
  })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async pull(controller) {
      for await (const chunk of result.textStream) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })

  c.header("Content-Type", "text/plain; charset=utf-8")
  c.header("X-Sources", encodeURIComponent(JSON.stringify(sources)))

  return c.body(stream)
})

aiRoutes.post("/ai/summarize/:bookmarkId", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const row = await getUserBookmark(c.req.param("bookmarkId"), user.id)

  if (!row) {
    return c.json({ error: "Bookmark not found" }, 404)
  }

  const result = await generateText({
    model: chatModel,
    system: "Summarize a saved X bookmark in one concise sentence. Do not invent details outside the provided post.",
    prompt: `Author: ${row.author ? `@${row.author.username}` : "unknown"}\nPost: ${row.post.text}`,
  })
  const [bookmark] = await db
    .update(bookmarks)
    .set({ aiSummary: result.text.trim(), updatedAt: new Date() })
    .where(and(eq(bookmarks.id, row.bookmark.id), eq(bookmarks.userId, user.id)))
    .returning()

  return c.json({ bookmark })
})

aiRoutes.post("/ai/suggest-tags/:bookmarkId", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const row = await getUserBookmark(c.req.param("bookmarkId"), user.id)

  if (!row) {
    return c.json({ error: "Bookmark not found" }, 404)
  }

  const result = await generateText({
    model: chatModel,
    system:
      "Suggest 3 to 5 short lowercase tags for a saved X bookmark. Return only a JSON array of strings. No markdown.",
    prompt: `Post: ${row.post.text}`,
  })
  const names = parseTagNames(result.text)
  const createdTags = []

  for (const name of names) {
    const [tag] = await db
      .insert(tags)
      .values({ userId: user.id, name })
      .onConflictDoUpdate({
        target: [tags.userId, tags.name],
        set: { updatedAt: new Date() },
      })
      .returning()

    await db
      .insert(bookmarkTags)
      .values({ bookmarkId: row.bookmark.id, tagId: tag.id })
      .onConflictDoNothing({ target: [bookmarkTags.bookmarkId, bookmarkTags.tagId] })

    createdTags.push(tag)
  }

  return c.json({ tags: createdTags })
})

async function getUserBookmark(bookmarkId: string, userId: string) {
  const [row] = await db
    .select({ bookmark: bookmarks, post: posts, author: postAuthors })
    .from(bookmarks)
    .innerJoin(posts, eq(bookmarks.postId, posts.id))
    .leftJoin(postAuthors, eq(posts.authorId, postAuthors.id))
    .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)))
    .limit(1)

  return row
}

function parseTagNames(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown

    if (Array.isArray(parsed)) {
      return normalizeTags(parsed)
    }
  } catch {
    return normalizeTags(value.split(/[\n,]/))
  }

  return []
}

function normalizeTags(values: unknown[]): string[] {
  return [...new Set(values.map((value) => String(value).trim().toLowerCase().replace(/^#/, "")).filter(Boolean))].slice(0, 5)
}

function formatConversation(
  messages: Array<{ role: "user" | "assistant"; content: string }> | undefined,
  question: string,
) {
  const history = (messages ?? [])
    .slice(-8)
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content.slice(0, 2_000)}`)
    .join("\n")

  return history || `User: ${question}`
}
