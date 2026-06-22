import { and, asc, eq, inArray, sql } from "drizzle-orm"

import { getValidXAuthForUser } from "../auth/x-token"
import { db } from "../db/client"
import {
  bookmarkThreadPosts,
  bookmarks,
  postAuthors,
  postMedia,
  postUrls,
  posts,
  syncJobs,
} from "../db/schema"
import { aiQueue } from "../queues/ai"
import {
  fetchAuthorTimeline,
  fetchBookmarksPage,
  type XBookmarkMedia,
  type XBookmarkPost,
  type XBookmarkUser,
  type XBookmarksPage,
  XApiError,
} from "../x/bookmarks"

const ownedReadEstimatedCostMicros = 1_000
const threadLookbackMs = 24 * 60 * 60 * 1_000
const threadLookaheadMs = 7 * 24 * 60 * 60 * 1_000

export async function syncBookmarks(input: { syncJobId: string; userId: string }) {
  await db.update(syncJobs).set({ status: "running", startedAt: new Date(), updatedAt: new Date() }).where(eq(syncJobs.id, input.syncJobId))

  try {
    let auth = await getValidXAuthForUser(input.userId)
    let cursor: string | null = null
    let resourcesFetched = 0
    const threadCache = new Map<string, Promise<XBookmarksPage | null>>()

    do {
      let page: XBookmarksPage
      try {
        page = await fetchBookmarksPage({
          accessToken: auth.accessToken,
          xUserId: auth.xUserId,
          paginationToken: cursor,
        })
      } catch (error) {
        if (!(error instanceof XApiError) || error.status !== 401) {
          throw error
        }

        auth = await getValidXAuthForUser(input.userId, true)
        page = await fetchBookmarksPage({
          accessToken: auth.accessToken,
          xUserId: auth.xUserId,
          paginationToken: cursor,
        })
      }

      const authorsByXId = new Map(page.includes?.users?.map((author) => [author.id, author]) ?? [])
      const mediaByKey = new Map(page.includes?.media?.map((media) => [media.media_key, media]) ?? [])
      const pagePosts = page.data ?? []

      const existingIds = pagePosts.length > 0
        ? new Set(
            (
              await db
                .select({ xPostId: bookmarks.xPostId })
                .from(bookmarks)
                .where(
                  and(
                    eq(bookmarks.userId, input.userId),
                    inArray(bookmarks.xPostId, pagePosts.map((p) => p.id)),
                  ),
                )
            ).map((r) => r.xPostId),
          )
        : new Set<string>()
      const newPosts = pagePosts.filter((post) => !existingIds.has(post.id))

      if (newPosts.length === 0 && existingIds.size > 0) {
        cursor = null
        await db
          .update(syncJobs)
          .set({
            cursor,
            resourcesFetched,
            status: "completed",
            finishedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(syncJobs.id, input.syncJobId))
        break
      }

      for (const referencedPost of page.includes?.tweets ?? []) {
        await upsertPostRecord({
          post: referencedPost,
          author: referencedPost.author_id ? authorsByXId.get(referencedPost.author_id) : undefined,
          mediaByKey,
        })
      }

      for (const post of newPosts) {
        const author = inputAuthor(post, authorsByXId)
        const stored = await upsertBookmarkPost({
          userId: input.userId,
          post,
          author,
          mediaByKey,
        })

        let threadChanged = false
        if (shouldFetchThread(post, author)) {
          threadChanged = await syncBookmarkThread({
            accessToken: auth.accessToken,
            bookmarkId: stored.bookmarkId,
            bookmarkedPost: post,
            bookmarkedPostId: stored.postId,
            bookmarkedAuthor: author,
            threadCache,
          })
        }

        if (stored.needsEnrichment || threadChanged) {
          await aiQueue.add(
            "bookmark.enrich",
            { bookmarkId: stored.bookmarkId, userId: input.userId },
            { jobId: `enrich-${stored.bookmarkId}-${stored.updatedAt.getTime()}` },
          )
        }
      }

      resourcesFetched += newPosts.length
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

async function upsertBookmarkPost(input: {
  userId: string
  post: XBookmarkPost
  author?: XBookmarkUser
  mediaByKey: Map<string, XBookmarkMedia>
}) {
  const [existing] = await db
    .select({
      postText: posts.text,
      summary: bookmarks.aiSummary,
    })
    .from(bookmarks)
    .innerJoin(posts, eq(bookmarks.postId, posts.id))
    .where(and(eq(bookmarks.userId, input.userId), eq(bookmarks.xPostId, input.post.id)))
    .limit(1)
  const canonicalText = getCanonicalPostText(input.post)
  const storedPost = await upsertPostRecord(input)
  const updatedAt = new Date()

  const [bookmark] = await db
    .insert(bookmarks)
    .values({
      userId: input.userId,
      postId: storedPost.id,
      xPostId: input.post.id,
    })
    .onConflictDoUpdate({
      target: [bookmarks.userId, bookmarks.xPostId],
      set: {
        postId: storedPost.id,
        updatedAt,
      },
    })
    .returning({ id: bookmarks.id })

  return {
    bookmarkId: bookmark.id,
    postId: storedPost.id,
    needsEnrichment: !existing?.summary || existing.postText !== canonicalText,
    updatedAt,
  }
}

async function upsertPostRecord(input: {
  post: XBookmarkPost
  author?: XBookmarkUser
  mediaByKey: Map<string, XBookmarkMedia>
}) {
  const authorId = input.author ? await upsertAuthor(input.author) : null
  const metrics = input.post.public_metrics
  const text = getCanonicalPostText(input.post)
  const [post] = await db
    .insert(posts)
    .values({
      xPostId: input.post.id,
      authorId,
      conversationId: input.post.conversation_id,
      text,
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
        text,
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

  const urls = getCanonicalPostEntities(input.post)?.urls ?? []

  await db.delete(postUrls).where(eq(postUrls.postId, post.id))

  for (const url of urls) {
    await db.insert(postUrls).values({
      postId: post.id,
      url: url.url,
      expandedUrl: url.expanded_url,
      displayUrl: url.display_url,
      title: url.title,
      description: url.description,
      imageUrl: url.images?.[0]?.url,
    })
  }

  await db.delete(postMedia).where(eq(postMedia.postId, post.id))

  for (const mediaKey of input.post.attachments?.media_keys ?? []) {
    const media = input.mediaByKey.get(mediaKey)
    if (!media) {
      continue
    }

    await db.insert(postMedia).values({
      postId: post.id,
      mediaKey,
      type: media.type,
      url: media.url,
      previewImageUrl: media.preview_image_url,
      rawJson: media,
    })
  }

  return post
}

async function syncBookmarkThread(input: {
  accessToken: string
  bookmarkId: string
  bookmarkedPost: XBookmarkPost
  bookmarkedPostId: string
  bookmarkedAuthor?: XBookmarkUser
  threadCache: Map<string, Promise<XBookmarksPage | null>>
}) {
  if (!input.bookmarkedPost.conversation_id || !input.bookmarkedPost.created_at || !input.bookmarkedAuthor) {
    return false
  }

  const window = getThreadTimelineWindow(input.bookmarkedPost.created_at)
  const cacheKey = `${input.bookmarkedAuthor.id}:${window.startTime}:${window.endTime}`
  let threadPromise = input.threadCache.get(cacheKey)
  if (!threadPromise) {
    threadPromise = fetchAuthorTimeline({
      accessToken: input.accessToken,
      xUserId: input.bookmarkedAuthor.id,
      startTime: window.startTime,
      endTime: window.endTime,
    }).catch((error) => {
      console.warn(`Thread lookup skipped for ${cacheKey}`, error)
      return null
    })
    input.threadCache.set(cacheKey, threadPromise)
  }

  const page = await threadPromise
  if (!page) {
    return false
  }

  const postsInThread = (page?.data ?? []).filter(
    (post) => post.conversation_id === input.bookmarkedPost.conversation_id,
  )

  const authorsByXId = new Map(page?.includes?.users?.map((author) => [author.id, author]) ?? [])
  const mediaByKey = new Map(page?.includes?.media?.map((media) => [media.media_key, media]) ?? [])
  const uniquePosts = new Map<string, XBookmarkPost>([
    [input.bookmarkedPost.id, input.bookmarkedPost],
    ...postsInThread.map((post) => [post.id, post] as const),
  ])
  const strictThread = buildStrictAuthorThread({
    bookmarkedPostId: input.bookmarkedPost.id,
    authorId: input.bookmarkedPost.author_id,
    posts: [...uniquePosts.values()],
  })

  const existingThread = await db
    .select({ xPostId: posts.xPostId })
    .from(bookmarkThreadPosts)
    .innerJoin(posts, eq(bookmarkThreadPosts.postId, posts.id))
    .where(eq(bookmarkThreadPosts.bookmarkId, input.bookmarkId))
    .orderBy(asc(bookmarkThreadPosts.position))
  const nextThreadIds = strictThread.length > 1 ? strictThread.map((post) => post.id) : []
  const existingThreadIds = existingThread.map((post) => post.xPostId)

  if (existingThreadIds.join(",") === nextThreadIds.join(",")) {
    return false
  }

  await db.delete(bookmarkThreadPosts).where(eq(bookmarkThreadPosts.bookmarkId, input.bookmarkId))

  if (strictThread.length < 2) {
    return true
  }

  for (const [position, threadPost] of strictThread.entries()) {
    const postId =
      threadPost.id === input.bookmarkedPost.id
        ? input.bookmarkedPostId
        : (
            await upsertPostRecord({
              post: threadPost,
              author: threadPost.author_id ? authorsByXId.get(threadPost.author_id) : undefined,
              mediaByKey,
            })
          ).id

    await db
      .insert(bookmarkThreadPosts)
      .values({ bookmarkId: input.bookmarkId, postId, position })
      .onConflictDoUpdate({
        target: [bookmarkThreadPosts.bookmarkId, bookmarkThreadPosts.postId],
        set: { position },
      })
  }

  return true
}

function buildStrictAuthorThread(input: {
  bookmarkedPostId: string
  authorId?: string
  posts: XBookmarkPost[]
}) {
  const authorId = input.authorId
  if (!authorId) {
    return []
  }

  const eligiblePosts = input.posts.filter((post) => post.author_id === authorId)
  const postsById = new Map(eligiblePosts.map((post) => [post.id, post]))
  const bookmarkedPost = postsById.get(input.bookmarkedPostId)

  if (!bookmarkedPost) {
    return []
  }

  const ancestorIds: string[] = []
  const visited = new Set<string>([bookmarkedPost.id])
  let current = bookmarkedPost

  while (true) {
    const parentId = getReplyParentId(current)
    const parent = parentId ? postsById.get(parentId) : undefined
    if (!parent || visited.has(parent.id) || !isSelfReply(current, authorId)) {
      break
    }
    ancestorIds.unshift(parent.id)
    visited.add(parent.id)
    current = parent
  }

  const chain = [...ancestorIds.map((id) => postsById.get(id)!), bookmarkedPost]
  current = bookmarkedPost

  while (true) {
    const children = eligiblePosts
      .filter(
        (post) =>
          !visited.has(post.id) &&
          getReplyParentId(post) === current.id &&
          isSelfReply(post, authorId),
      )
      .sort((a, b) => getPostTimestamp(a) - getPostTimestamp(b))
    if (children.length !== 1) {
      break
    }
    const child = children[0]
    chain.push(child)
    visited.add(child.id)
    current = child
  }

  return chain
}

function getReplyParentId(post: XBookmarkPost) {
  return post.referenced_tweets?.find((reference) => reference.type === "replied_to")?.id
}

function isSelfReply(post: XBookmarkPost, authorId: string) {
  return !post.in_reply_to_user_id || post.in_reply_to_user_id === authorId
}

function getCanonicalPostText(post: XBookmarkPost) {
  return post.note_tweet?.text?.trim() || post.text
}

function getCanonicalPostEntities(post: XBookmarkPost) {
  return post.note_tweet?.entities ?? post.entities
}

function shouldFetchThread(post: XBookmarkPost, author?: XBookmarkUser) {
  return Boolean(
    author &&
      post.conversation_id &&
      (post.conversation_id !== post.id ||
        (post.public_metrics?.reply_count ?? 0) > 0 ||
        post.referenced_tweets?.some((reference) => reference.type === "replied_to")),
  )
}

function inputAuthor(post: XBookmarkPost, authorsByXId: Map<string, XBookmarkUser>) {
  return post.author_id ? authorsByXId.get(post.author_id) : undefined
}

function getPostTimestamp(post: XBookmarkPost) {
  return post.created_at ? new Date(post.created_at).getTime() : Number(post.id)
}

function getThreadTimelineWindow(createdAt: string) {
  const postedAt = new Date(createdAt)
  const start = new Date(postedAt.getTime() - threadLookbackMs)
  const end = new Date(Math.min(postedAt.getTime() + threadLookaheadMs, Date.now() - 10_000))

  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  }
}

export async function refreshBookmarkThread(input: { bookmarkId: string; userId?: string }) {
  const conditions = [eq(bookmarks.id, input.bookmarkId)]
  if (input.userId) {
    conditions.push(eq(bookmarks.userId, input.userId))
  }

  const [row] = await db
    .select({
      userId: bookmarks.userId,
      bookmarkId: bookmarks.id,
      postId: posts.id,
      xPostId: posts.xPostId,
      rawJson: posts.rawJson,
      authorXUserId: postAuthors.xUserId,
      authorUsername: postAuthors.username,
      authorDisplayName: postAuthors.displayName,
      authorAvatarUrl: postAuthors.avatarUrl,
    })
    .from(bookmarks)
    .innerJoin(posts, eq(bookmarks.postId, posts.id))
    .leftJoin(postAuthors, eq(posts.authorId, postAuthors.id))
    .where(and(...conditions))
    .limit(1)

  if (!row?.rawJson || !row.authorXUserId || !row.authorUsername) {
    throw new Error("Bookmark post or author data is unavailable")
  }

  const bookmarkedPost = row.rawJson as XBookmarkPost
  bookmarkedPost.id ||= row.xPostId
  const auth = await getValidXAuthForUser(row.userId)

  const threadChanged = await syncBookmarkThread({
    accessToken: auth.accessToken,
    bookmarkId: row.bookmarkId,
    bookmarkedPost,
    bookmarkedPostId: row.postId,
    bookmarkedAuthor: {
      id: row.authorXUserId,
      username: row.authorUsername,
      name: row.authorDisplayName ?? row.authorUsername,
      profile_image_url: row.authorAvatarUrl ?? undefined,
    },
    threadCache: new Map(),
  })

  if (threadChanged) {
    await aiQueue.add(
      "bookmark.enrich",
      { bookmarkId: row.bookmarkId, userId: row.userId },
      { jobId: `enrich-thread-${row.bookmarkId}-${Date.now()}` },
    )
  }
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
