import { generateText } from "ai"
import { Hono } from "hono"

import { findRelevantBookmarks } from "../../ai/embeddings"
import { chatModel } from "../../ai/models"
import { requireUser } from "../require-user"

export const aiRoutes = new Hono()

aiRoutes.post("/ai/chat", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const body = (await c.req.json()) as { question?: string }

  if (!body.question?.trim()) {
    return c.json({ error: "Question is required" }, 400)
  }

  const sources = await findRelevantBookmarks({ userId: user.id, query: body.question, limit: 8 })

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
    prompt: `Question: ${body.question}\n\nSaved bookmark context:\n${context}`,
  })

  return c.json({
    answer: result.text,
    sources,
  })
})

aiRoutes.post("/ai/summarize/:bookmarkId", async (c) => {
  return c.json({ error: `Summaries for ${c.req.param("bookmarkId")} are not implemented yet` }, 501)
})

aiRoutes.post("/ai/suggest-tags/:bookmarkId", async (c) => {
  return c.json({ error: `Tag suggestions for ${c.req.param("bookmarkId")} are not implemented yet` }, 501)
})
