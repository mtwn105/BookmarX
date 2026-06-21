import { and, cosineDistance, desc, eq, gt, sql } from "drizzle-orm"
import { embed, embedMany } from "ai"

import { db } from "../db/client"
import { bookmarkChunks, bookmarkEmbeddings, bookmarks, postAuthors, posts } from "../db/schema"
import { embeddingModel } from "./models"

export type RelevantBookmark = {
  bookmarkId: string
  postId: string
  postText: string
  authorUsername: string | null
  authorDisplayName: string | null
  chunk: string
  similarity: number
  xPostId: string
}

export async function embedBookmark(bookmarkId: string) {
  const [row] = await db
    .select({ bookmark: bookmarks, post: posts, author: postAuthors })
    .from(bookmarks)
    .innerJoin(posts, eq(bookmarks.postId, posts.id))
    .leftJoin(postAuthors, eq(posts.authorId, postAuthors.id))
    .where(eq(bookmarks.id, bookmarkId))
    .limit(1)

  if (!row) {
    throw new Error("Bookmark not found for embedding")
  }

  const canonicalText = createCanonicalBookmarkText(row)
  const chunks = chunkText(canonicalText)

  await db.delete(bookmarkChunks).where(eq(bookmarkChunks.bookmarkId, bookmarkId))

  if (chunks.length === 0) {
    return
  }

  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks,
  })

  for (const [index, content] of chunks.entries()) {
    const [chunk] = await db
      .insert(bookmarkChunks)
      .values({
        bookmarkId,
        content,
        tokenCount: estimateTokenCount(content),
      })
      .returning({ id: bookmarkChunks.id })

    await db.insert(bookmarkEmbeddings).values({
      chunkId: chunk.id,
      model: embeddingModel,
      dimensions: embeddings[index]?.length ?? 1536,
      embedding: embeddings[index],
    })
  }
}

export async function findRelevantBookmarks(input: { userId: string; query: string; limit?: number }): Promise<RelevantBookmark[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: input.query.replaceAll("\n", " "),
  })
  const similarity = sql<number>`1 - (${cosineDistance(bookmarkEmbeddings.embedding, embedding)})`
  const rows = await db
    .select({
      bookmarkId: bookmarks.id,
      postId: posts.id,
      postText: posts.text,
      authorUsername: postAuthors.username,
      authorDisplayName: postAuthors.displayName,
      chunk: bookmarkChunks.content,
      similarity,
      xPostId: posts.xPostId,
    })
    .from(bookmarkEmbeddings)
    .innerJoin(bookmarkChunks, eq(bookmarkEmbeddings.chunkId, bookmarkChunks.id))
    .innerJoin(bookmarks, eq(bookmarkChunks.bookmarkId, bookmarks.id))
    .innerJoin(posts, eq(bookmarks.postId, posts.id))
    .leftJoin(postAuthors, eq(posts.authorId, postAuthors.id))
    .where(and(eq(bookmarks.userId, input.userId), gt(similarity, 0.35)))
    .orderBy(desc(similarity))
    .limit(input.limit ?? 8)

  return rows
}

function createCanonicalBookmarkText(row: {
  post: typeof posts.$inferSelect
  author: typeof postAuthors.$inferSelect | null
  bookmark: typeof bookmarks.$inferSelect
}) {
  return [
    row.author ? `Author: ${row.author.displayName ?? row.author.username} (@${row.author.username})` : null,
    `Post: ${row.post.text}`,
    row.post.contentType !== "unknown" ? `Content type: ${row.post.contentType}` : null,
    row.bookmark.note ? `Private note: ${row.bookmark.note}` : null,
    row.bookmark.aiSummary ? `Summary: ${row.bookmark.aiSummary}` : null,
  ]
    .filter(Boolean)
    .join("\n")
}

function chunkText(input: string): string[] {
  const sentences = input
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  const chunks: string[] = []
  let current = ""

  for (const sentence of sentences) {
    if (`${current} ${sentence}`.trim().length > 900 && current) {
      chunks.push(current)
      current = sentence
    } else {
      current = `${current} ${sentence}`.trim()
    }
  }

  if (current) {
    chunks.push(current)
  }

  return chunks.length > 0 ? chunks : [input.trim()].filter(Boolean)
}

function estimateTokenCount(input: string): number {
  return Math.ceil(input.length / 4)
}
