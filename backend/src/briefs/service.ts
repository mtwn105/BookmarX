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
      [
        "You are the editor of a concise personal intelligence brief built from saved X bookmarks.",
        "Use only the supplied bookmarks and cite every specific claim with bracket numbers like [1].",
        "Write clean Markdown with these sections: Executive summary, Themes worth noticing, Key takeaways, and Worth reopening.",
        "Group related ideas instead of summarizing every post individually.",
        "Worth reopening should contain 3 to 5 useful items with a short reason and citation.",
        "Avoid generic productivity advice and do not invent facts.",
      ].join(" "),
    prompt: `Create today's BookmarX intelligence brief from these bookmarks:\n\n${context}`,
  })
  const [brief] = await db
    .insert(briefs)
    .values({
      userId,
      title: `Your daily signal — ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date())}`,
      content: result.text,
      generatedFor: new Date(),
    })
    .returning()

  return brief
}
