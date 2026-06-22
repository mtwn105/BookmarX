import { generateText } from "ai"
import { and, asc, eq } from "drizzle-orm"

import { chatModel } from "../ai/models"
import { ensureStandardFolders, isStandardFolderName, standardFolders } from "../ai/taxonomy"
import { db } from "../db/client"
import {
  bookmarkFolders,
  bookmarkTags,
  bookmarkThreadPosts,
  bookmarks,
  postAuthors,
  posts,
  tags,
} from "../db/schema"
import { embedBookmark } from "../ai/embeddings"

const allowedContentTypes = new Set([
  "post",
  "thread",
  "link",
  "media",
  "idea",
  "code",
  "research",
  "news",
  "unknown",
])

type Enrichment = {
  summary: string
  folder: string
  tags: string[]
  contentType: string
}

export async function enrichBookmark(input: { bookmarkId: string; userId: string }) {
  const [row] = await db
    .select({ bookmark: bookmarks, post: posts, author: postAuthors })
    .from(bookmarks)
    .innerJoin(posts, eq(bookmarks.postId, posts.id))
    .leftJoin(postAuthors, eq(posts.authorId, postAuthors.id))
    .where(and(eq(bookmarks.id, input.bookmarkId), eq(bookmarks.userId, input.userId)))
    .limit(1)

  if (!row) {
    throw new Error("Bookmark not found for enrichment")
  }
  const threadPosts = await db
    .select({ text: posts.text })
    .from(bookmarkThreadPosts)
    .innerJoin(posts, eq(bookmarkThreadPosts.postId, posts.id))
    .where(eq(bookmarkThreadPosts.bookmarkId, input.bookmarkId))
    .orderBy(asc(bookmarkThreadPosts.position))
  const content =
    threadPosts.length > 1
      ? threadPosts.map((post, index) => `Thread part ${index + 1}: ${post.text}`).join("\n\n")
      : `Post: ${row.post.text}`

  const result = await generateText({
    model: chatModel,
    system: [
      "Classify a saved X post for a personal knowledge library.",
      "Return only valid JSON with keys summary, folder, tags, contentType.",
      "summary must be one useful sentence under 240 characters.",
      `folder must be exactly one of: ${standardFolders.map((folder) => folder.name).join(", ")}.`,
      "tags must contain 3 to 5 short lowercase topic tags without #.",
      "contentType must be one of post, thread, link, media, idea, code, research, news, unknown.",
      "Do not invent details outside the post.",
    ].join(" "),
    prompt: [
      row.author ? `Author: ${row.author.displayName ?? row.author.username} (@${row.author.username})` : null,
      content,
    ]
      .filter(Boolean)
      .join("\n"),
  })

  const enrichment = parseEnrichment(result.text)
  const availableFolders = await ensureStandardFolders(input.userId)
  const folderName = isStandardFolderName(enrichment.folder) ? enrichment.folder : "Miscellaneous"
  const selectedFolder = availableFolders.find((folder) => folder.name === folderName)
  const contentType = allowedContentTypes.has(enrichment.contentType) ? enrichment.contentType : "unknown"

  await db.transaction(async (tx) => {
    await tx
      .update(bookmarks)
      .set({
        aiSummary: enrichment.summary,
        aiContentType: contentType as typeof bookmarks.$inferInsert.aiContentType,
        updatedAt: new Date(),
      })
      .where(and(eq(bookmarks.id, input.bookmarkId), eq(bookmarks.userId, input.userId)))

    await tx
      .update(posts)
      .set({
        contentType: contentType as typeof posts.$inferInsert.contentType,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, row.post.id))

    await tx.delete(bookmarkFolders).where(eq(bookmarkFolders.bookmarkId, input.bookmarkId))
    if (selectedFolder) {
      await tx
        .insert(bookmarkFolders)
        .values({ bookmarkId: input.bookmarkId, folderId: selectedFolder.id })
        .onConflictDoNothing()
    }

    await tx.delete(bookmarkTags).where(eq(bookmarkTags.bookmarkId, input.bookmarkId))
    for (const tagName of enrichment.tags) {
      const [tag] = await tx
        .insert(tags)
        .values({ userId: input.userId, name: tagName })
        .onConflictDoUpdate({
          target: [tags.userId, tags.name],
          set: { updatedAt: new Date() },
        })
        .returning()

      await tx
        .insert(bookmarkTags)
        .values({ bookmarkId: input.bookmarkId, tagId: tag.id })
        .onConflictDoNothing()
    }
  })

  await embedBookmark(input.bookmarkId)
}

function parseEnrichment(value: string): Enrichment {
  const match = value.match(/\{[\s\S]*\}/)

  if (!match) {
    throw new Error("AI enrichment did not return JSON")
  }

  const parsed = JSON.parse(match[0]) as Partial<Enrichment>
  const tags = Array.isArray(parsed.tags)
    ? [...new Set(parsed.tags.map(normalizeTag).filter(Boolean))].slice(0, 5)
    : []

  return {
    summary: String(parsed.summary ?? "").trim().slice(0, 240),
    folder: String(parsed.folder ?? "Miscellaneous").trim(),
    tags: tags.length >= 3 ? tags : [...tags, "saved", "reference", "x-post"].slice(0, 3),
    contentType: String(parsed.contentType ?? "unknown").trim().toLowerCase(),
  }
}

function normalizeTag(value: unknown) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/[^a-z0-9+.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
}
