import { cookies } from "next/headers"

export type User = {
  id: string
  name: string | null
  email: string | null
  imageUrl: string | null
}

export type PostAuthor = {
  id: string
  xUserId: string
  username: string
  displayName: string | null
  avatarUrl: string | null
}

export type Post = {
  id: string
  xPostId: string
  text: string
  contentType: string
  postedAt: string | null
  likeCount: number | null
  repostCount: number | null
  replyCount: number | null
  bookmarkCount: number | null
}

export type Bookmark = {
  id: string
  status: "active" | "archived" | "deleted"
  note: string | null
  aiSummary: string | null
  aiContentType: string
  createdAt: string
  xBookmarkedAt: string | null
}

export type BookmarkRow = {
  bookmark: Bookmark
  post: Post
  author: PostAuthor | null
}

export type Folder = {
  id: string
  name: string
  color: string | null
  parentId: string | null
  sortOrder: number
}

export type Tag = {
  id: string
  name: string
  color: string | null
}

export type SyncJob = {
  id: string
  status: "queued" | "running" | "completed" | "failed" | "cancelled"
  resourcesFetched: number
  estimatedCostMicros: number
  errorMessage: string | null
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
}

export type AiAnswer = {
  answer: string
  sources: Array<{
    bookmarkId: string
    postId: string
    postText: string
    authorUsername: string | null
    authorDisplayName: string | null
    chunk: string
    similarity: number
    xPostId: string
  }>
}

export type Brief = {
  id: string
  title: string
  content: string
  generatedFor: string
  createdAt: string
}

export type AnalyticsOverview = {
  bookmarks: number
  archived: number
  briefs: number
  syncJobs: number
  topAuthors: Array<{
    username: string
    displayName: string | null
    total: number
  }>
}

export type UserSettings = {
  id: string
  aiProvider: string
  embeddingModel: string
  chatModel: string
  scheduledSyncEnabled: boolean
  dailyBriefEnabled: boolean
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export async function getMe(): Promise<User | null> {
  const response = await apiFetch<{ user: User | null }>("/me", { allowUnauthorized: true })

  return response?.user ?? null
}

export async function getBookmarks(query?: string): Promise<BookmarkRow[]> {
  const search = query ? `?q=${encodeURIComponent(query)}` : ""
  const response = await apiFetch<{ bookmarks: BookmarkRow[] }>(`/bookmarks${search}`)

  return response.bookmarks
}

export async function getBookmark(id: string): Promise<BookmarkRow | null> {
  return apiFetch<BookmarkRow>(`/bookmarks/${id}`, { allowNotFound: true })
}

export async function getFolders(): Promise<Folder[]> {
  const response = await apiFetch<{ folders: Folder[] }>("/folders")

  return response.folders
}

export async function getTags(): Promise<Tag[]> {
  const response = await apiFetch<{ tags: Tag[] }>("/tags")

  return response.tags
}

export async function getSyncJobs(): Promise<SyncJob[]> {
  const response = await apiFetch<{ jobs: SyncJob[] }>("/sync/jobs")

  return response.jobs
}

export async function askBookmarks(question: string): Promise<AiAnswer> {
  return apiFetch<AiAnswer>("/ai/chat", {
    method: "POST",
    body: JSON.stringify({ question }),
  })
}

export async function getBriefs(): Promise<Brief[]> {
  const response = await apiFetch<{ briefs: Brief[] }>("/briefs")

  return response.briefs
}

export async function generateBrief(): Promise<Brief> {
  const response = await apiFetch<{ brief: Brief }>("/briefs/generate", { method: "POST" })

  return response.brief
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const response = await apiFetch<{ overview: AnalyticsOverview }>("/analytics/overview")

  return response.overview
}

export async function getSettings(): Promise<UserSettings> {
  const response = await apiFetch<{ settings: UserSettings }>("/settings")

  return response.settings
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { allowUnauthorized?: boolean; allowNotFound?: boolean } = {},
): Promise<T> {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.toString()
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      "content-type": "application/json",
    },
    cache: "no-store",
  })

  if (response.status === 401 && options.allowUnauthorized) {
    return null as T
  }

  if (response.status === 404 && options.allowNotFound) {
    return null as T
  }

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${path}`)
  }

  return response.json() as Promise<T>
}

export function xPostUrl(post: Post): string {
  return `https://x.com/i/web/status/${post.xPostId}`
}
