import { desc, eq } from "drizzle-orm"
import { generateText } from "ai"

import { chatModel } from "../ai/models"
import { db } from "../db/client"
import { bookmarks, briefs, postAuthors, posts } from "../db/schema"

export async function generateDailyBriefForUser(userId: string) {
  const rows = await db
    .select({ bookmark: bookmarks, post: posts, author: postAuthors })
    .from(bookmarks)
    .innerJoin(posts, eq(bookmarks.postId, posts.id))
    .leftJoin(postAuthors, eq(posts.authorId, postAuthors.id))
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.createdAt))
    .limit(16)

  if (rows.length === 0) {
    return null
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
      userId,
      title: "Daily bookmark brief",
      content: result.text,
      generatedFor: new Date(),
    })
    .returning()

  return brief
}
