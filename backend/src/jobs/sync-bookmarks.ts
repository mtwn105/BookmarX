import { eq } from "drizzle-orm"

import { db } from "../db/client"
import { bookmarks, oauthTokens, postAuthors, postUrls, posts, syncJobs, xAccounts } from "../db/schema"
import { decryptSecret } from "../lib/crypto"
import { aiQueue } from "../queues/ai"
import { fetchBookmarksPage, type XBookmarkPost, type XBookmarkUser } from "../x/bookmarks"

const ownedReadEstimatedCostMicros = 1_000

export async function syncBookmarks(input: { syncJobId: string; userId: string }) {
  await db.update(syncJobs).set({ status: "running", startedAt: new Date(), updatedAt: new Date() }).where(eq(syncJobs.id, input.syncJobId))

  try {
    const auth = await getXAuthForUser(input.userId)
    let cursor: string | null = null
    let resourcesFetched = 0

    do {
      const page = await fetchBookmarksPage({
        accessToken: auth.accessToken,
        xUserId: auth.xUserId,
        paginationToken: cursor,
      })

      const authorsByXId = new Map(page.includes?.users?.map((author) => [author.id, author]) ?? [])
      const pagePosts = page.data ?? []

      for (const post of pagePosts) {
        const bookmarkId = await upsertBookmarkPost({
          userId: input.userId,
          post,
          author: post.author_id ? authorsByXId.get(post.author_id) : undefined,
        })

        await aiQueue.add("bookmark.embed", { bookmarkId })
      }

      resourcesFetched += pagePosts.length
      cursor = page.meta?.next_token ?? null

      await db
        .update(syncJobs)
        .set({
          cursor,
          resourcesFetched,
          estimatedCostMicros: resourcesFetched * ownedReadEstimatedCostMicros,
          updatedAt: new Date(),
        })
        .where(eq(syncJobs.id, input.syncJobId))
    } while (cursor)

    await db
      .update(syncJobs)
      .set({ status: "completed", finishedAt: new Date(), updatedAt: new Date() })
      .where(eq(syncJobs.id, input.syncJobId))
  } catch (error) {
    await db
      .update(syncJobs)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown sync error",
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(syncJobs.id, input.syncJobId))

    throw error
  }
}

async function getXAuthForUser(userId: string) {
  const [auth] = await db
    .select({
      xUserId: xAccounts.xUserId,
      accessTokenEncrypted: oauthTokens.accessTokenEncrypted,
    })
    .from(xAccounts)
    .innerJoin(oauthTokens, eq(oauthTokens.xAccountId, xAccounts.id))
    .where(eq(xAccounts.userId, userId))
    .limit(1)

  if (!auth) {
    throw new Error("No X account connected")
  }

  return {
    xUserId: auth.xUserId,
    accessToken: decryptSecret(auth.accessTokenEncrypted),
  }
}

async function upsertBookmarkPost(input: { userId: string; post: XBookmarkPost; author?: XBookmarkUser }): Promise<string> {
  const authorId = input.author ? await upsertAuthor(input.author) : null
  const metrics = input.post.public_metrics
  const [post] = await db
    .insert(posts)
    .values({
      xPostId: input.post.id,
      authorId,
      conversationId: input.post.conversation_id,
      text: input.post.text,
      language: input.post.lang,
      replyCount: metrics?.reply_count,
      repostCount: metrics?.retweet_count,
      likeCount: metrics?.like_count,
      quoteCount: metrics?.quote_count,
      bookmarkCount: metrics?.bookmark_count,
      impressionCount: metrics?.impression_count,
      postedAt: input.post.created_at ? new Date(input.post.created_at) : null,
      rawJson: input.post,
    })
    .onConflictDoUpdate({
      target: posts.xPostId,
      set: {
        authorId,
        conversationId: input.post.conversation_id,
        text: input.post.text,
        language: input.post.lang,
        replyCount: metrics?.reply_count,
        repostCount: metrics?.retweet_count,
        likeCount: metrics?.like_count,
        quoteCount: metrics?.quote_count,
        bookmarkCount: metrics?.bookmark_count,
        impressionCount: metrics?.impression_count,
        postedAt: input.post.created_at ? new Date(input.post.created_at) : null,
        rawJson: input.post,
        updatedAt: new Date(),
      },
    })
    .returning({ id: posts.id })

  const [bookmark] = await db
    .insert(bookmarks)
    .values({
      userId: input.userId,
      postId: post.id,
      xPostId: input.post.id,
    })
    .onConflictDoUpdate({
      target: [bookmarks.userId, bookmarks.xPostId],
      set: {
        postId: post.id,
        updatedAt: new Date(),
      },
    })
    .returning({ id: bookmarks.id })

  const urls = input.post.entities?.urls ?? []

  await db.delete(postUrls).where(eq(postUrls.postId, post.id))

  for (const url of urls) {
    await db.insert(postUrls).values({
      postId: post.id,
      url: url.url,
      expandedUrl: url.expanded_url,
      displayUrl: url.display_url,
      title: url.title,
      description: url.description,
    })
  }

  return bookmark.id
}

async function upsertAuthor(author: XBookmarkUser): Promise<string> {
  const [storedAuthor] = await db
    .insert(postAuthors)
    .values({
      xUserId: author.id,
      username: author.username,
      displayName: author.name,
      avatarUrl: author.profile_image_url,
      rawJson: author,
    })
    .onConflictDoUpdate({
      target: postAuthors.xUserId,
      set: {
        username: author.username,
        displayName: author.name,
        avatarUrl: author.profile_image_url,
        rawJson: author,
        updatedAt: new Date(),
      },
    })
    .returning({ id: postAuthors.id })

  return storedAuthor.id
}
