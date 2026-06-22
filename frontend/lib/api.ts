import { cookies } from "next/headers"

export type User = {
  id: string
  name: string | null
  email: string | null
  imageUrl: string | null
  username: string | null
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
  rawJson?: Record<string, unknown>
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

export type PostUrl = {
  id: string
  postId: string
  url: string
  expandedUrl: string | null
  displayUrl: string | null
  title: string | null
  description: string | null
  imageUrl: string | null
}

export type PostMedia = {
  id: string
  postId: string
  mediaKey: string
  type: "photo" | "video" | "animated_gif"
  url: string | null
  previewImageUrl: string | null
  rawJson: {
    alt_text?: string
    width?: number
    height?: number
    duration_ms?: number
    variants?: Array<{
      bit_rate?: number
      content_type: string
      url: string
    }>
  } | null
}

export type QuotedPost = {
  post: Post
  author: PostAuthor | null
  urls: PostUrl[]
  media: PostMedia[]
}

export type ThreadPost = QuotedPost

export type BookmarkRow = {
  bookmark: Bookmark
  post: Post
  author: PostAuthor | null
  urls: PostUrl[]
  media: PostMedia[]
  folders: Folder[]
  tags: Tag[]
  quotedPost: QuotedPost | null
  threadPosts: ThreadPost[]
}

export type Folder = {
  id: string
  name: string
  color: string | null
  parentId: string | null
  sortOrder: number
  bookmarkCount: number
}

export type Tag = {
  id: string
  name: string
  color: string | null
}

export type BookmarkFilters = {
  q?: string
  folderId?: string
  tagId?: string
  author?: string
  contentType?: string
  media?: "with" | "without"
  postedFrom?: string
  postedTo?: string
  syncedFrom?: string
  syncedTo?: string
  sort?: "newest" | "oldest"
  limit?: number
}

export type BookmarkFilterOptions = {
  authors: Array<{ username: string; displayName: string | null }>
  tags: Array<{ id: string; name: string; color: string | null }>
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

export type SyncStatus = {
  job: SyncJob | null
  library: {
    total: number
    enriched: number
    pending: number
  }
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

export type Conversation = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

export type ConversationMessage = {
  id: string
  conversationId: string
  role: "user" | "assistant"
  content: string
  sources: Array<Record<string, unknown>> | null
  createdAt: string
}

export type ConversationDetail = {
  conversation: Conversation
  messages: ConversationMessage[]
}

export type UserSettings = {
  id: string
  aiProvider: string
  embeddingModel: string
  chatModel: string
  scheduledSyncEnabled: boolean
  dailyBriefEnabled: boolean
}

const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export async function getMe(): Promise<User | null> {
  const response = await apiFetch<{ user: User | null }>("/me", { allowUnauthorized: true })

  return response?.user ?? null
}

export async function getBookmarks(filters?: string | BookmarkFilters): Promise<BookmarkRow[]> {
  const normalized = typeof filters === "string" ? { q: filters } : filters
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(normalized ?? {})) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value))
    }
  }
  const search = params.size > 0 ? `?${params.toString()}` : ""
  const response = await apiFetch<{ bookmarks: BookmarkRow[] }>(`/bookmarks${search}`)

  return response.bookmarks
}

export async function getBookmarkFilterOptions(): Promise<BookmarkFilterOptions> {
  return apiFetch<BookmarkFilterOptions>("/bookmarks/filter-options")
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

export async function getSyncStatus(): Promise<SyncStatus> {
  return apiFetch<SyncStatus>("/sync/status")
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

export async function getConversations(): Promise<Conversation[]> {
  const response = await apiFetch<{ conversations: Conversation[] }>("/conversations")

  return response.conversations
}

export async function getConversation(id: string): Promise<ConversationDetail | null> {
  return apiFetch<ConversationDetail>(`/conversations/${id}`, { allowNotFound: true })
}

export async function createConversation(title?: string): Promise<Conversation> {
  const response = await apiFetch<{ conversation: Conversation }>("/conversations", {
    method: "POST",
    body: JSON.stringify({ title }),
  })

  return response.conversation
}

export async function updateConversation(id: string, title: string): Promise<Conversation> {
  const response = await apiFetch<{ conversation: Conversation }>(`/conversations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  })

  return response.conversation
}

export async function deleteConversation(id: string): Promise<void> {
  await apiFetch(`/conversations/${id}`, { method: "DELETE" })
}

export async function generateConversationTitle(id: string): Promise<string> {
  const response = await apiFetch<{ title: string }>(`/conversations/${id}/generate-title`, { method: "POST" })

  return response.title
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
