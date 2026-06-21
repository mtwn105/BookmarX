import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core"

export const syncJobStatus = pgEnum("sync_job_status", ["queued", "running", "completed", "failed", "cancelled"])
export const aiJobStatus = pgEnum("ai_job_status", ["queued", "running", "completed", "failed", "cancelled"])
export const bookmarkStatus = pgEnum("bookmark_status", ["active", "archived", "deleted"])
export const contentType = pgEnum("content_type", ["post", "thread", "link", "media", "idea", "code", "research", "news", "unknown"])
export const aiProvider = pgEnum("ai_provider", ["vercel", "openai", "xai", "ollama", "custom"])

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name"),
    email: text("email"),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_unique_idx").on(table.email)],
)

export const xAccounts = pgTable(
  "x_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    xUserId: text("x_user_id").notNull(),
    username: text("username").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("x_accounts_x_user_id_unique_idx").on(table.xUserId),
    index("x_accounts_user_id_idx").on(table.userId),
  ],
)

export const oauthTokens = pgTable(
  "oauth_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    xAccountId: uuid("x_account_id")
      .notNull()
      .references(() => xAccounts.id, { onDelete: "cascade" }),
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    refreshTokenEncrypted: text("refresh_token_encrypted"),
    scope: text("scope"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("oauth_tokens_x_account_id_unique_idx").on(table.xAccountId)],
)

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique_idx").on(table.tokenHash),
    index("sessions_user_id_idx").on(table.userId),
  ],
)

export const postAuthors = pgTable(
  "post_authors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    xUserId: text("x_user_id").notNull(),
    username: text("username").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    rawJson: jsonb("raw_json").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("post_authors_x_user_id_unique_idx").on(table.xUserId)],
)

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    xPostId: text("x_post_id").notNull(),
    authorId: uuid("author_id").references(() => postAuthors.id, { onDelete: "set null" }),
    conversationId: text("conversation_id"),
    text: text("text").notNull(),
    language: text("language"),
    contentType: contentType("content_type").notNull().default("unknown"),
    replyCount: integer("reply_count"),
    repostCount: integer("repost_count"),
    likeCount: integer("like_count"),
    quoteCount: integer("quote_count"),
    bookmarkCount: integer("bookmark_count"),
    impressionCount: integer("impression_count"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    rawJson: jsonb("raw_json").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("posts_x_post_id_unique_idx").on(table.xPostId),
    index("posts_author_id_idx").on(table.authorId),
    index("posts_posted_at_idx").on(table.postedAt),
  ],
)

export const postMedia = pgTable(
  "post_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    mediaKey: text("media_key").notNull(),
    type: text("type").notNull(),
    url: text("url"),
    previewImageUrl: text("preview_image_url"),
    rawJson: jsonb("raw_json").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("post_media_post_id_media_key_unique_idx").on(table.postId, table.mediaKey)],
)

export const postUrls = pgTable(
  "post_urls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    expandedUrl: text("expanded_url"),
    displayUrl: text("display_url"),
    title: text("title"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("post_urls_post_id_idx").on(table.postId)],
)

export const folders = pgTable(
  "folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    name: text("name").notNull(),
    color: text("color"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("folders_user_id_parent_id_name_unique_idx").on(table.userId, table.parentId, table.name),
    index("folders_user_id_idx").on(table.userId),
  ],
)

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("tags_user_id_name_unique_idx").on(table.userId, table.name)],
)

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    xPostId: text("x_post_id").notNull(),
    status: bookmarkStatus("status").notNull().default("active"),
    note: text("note"),
    aiSummary: text("ai_summary"),
    aiContentType: contentType("ai_content_type").notNull().default("unknown"),
    readAt: timestamp("read_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    xBookmarkedAt: timestamp("x_bookmarked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("bookmarks_user_id_x_post_id_unique_idx").on(table.userId, table.xPostId),
    index("bookmarks_user_id_idx").on(table.userId),
    index("bookmarks_post_id_idx").on(table.postId),
    index("bookmarks_status_idx").on(table.status),
    index("bookmarks_x_bookmarked_at_idx").on(table.xBookmarkedAt),
  ],
)

export const bookmarkFolders = pgTable(
  "bookmark_folders",
  {
    bookmarkId: uuid("bookmark_id")
      .notNull()
      .references(() => bookmarks.id, { onDelete: "cascade" }),
    folderId: uuid("folder_id")
      .notNull()
      .references(() => folders.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.bookmarkId, table.folderId] })],
)

export const bookmarkTags = pgTable(
  "bookmark_tags",
  {
    bookmarkId: uuid("bookmark_id")
      .notNull()
      .references(() => bookmarks.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.bookmarkId, table.tagId] })],
)

export const bookmarkChunks = pgTable(
  "bookmark_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookmarkId: uuid("bookmark_id")
      .notNull()
      .references(() => bookmarks.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    tokenCount: integer("token_count"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("bookmark_chunks_bookmark_id_idx").on(table.bookmarkId)],
)

export const bookmarkEmbeddings = pgTable(
  "bookmark_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chunkId: uuid("chunk_id")
      .notNull()
      .references(() => bookmarkChunks.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    dimensions: integer("dimensions").notNull().default(1536),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("bookmark_embeddings_chunk_id_model_unique_idx").on(table.chunkId, table.model),
    index("bookmark_embeddings_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
)

export const syncJobs = pgTable(
  "sync_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: syncJobStatus("status").notNull().default("queued"),
    cursor: text("cursor"),
    resourcesFetched: integer("resources_fetched").notNull().default(0),
    estimatedCostMicros: integer("estimated_cost_micros").notNull().default(0),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sync_jobs_user_id_created_at_idx").on(table.userId, table.createdAt)],
)

export const aiJobs = pgTable(
  "ai_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookmarkId: uuid("bookmark_id").references(() => bookmarks.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    status: aiJobStatus("status").notNull().default("queued"),
    model: text("model"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ai_jobs_user_id_created_at_idx").on(table.userId, table.createdAt)],
)

export const briefs = pgTable(
  "briefs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    generatedFor: timestamp("generated_for", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("briefs_user_id_generated_for_idx").on(table.userId, table.generatedFor)],
)

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookmarkId: uuid("bookmark_id").references(() => bookmarks.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("events_user_id_created_at_idx").on(table.userId, table.createdAt)],
)

export const settings = pgTable(
  "settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    aiProvider: aiProvider("ai_provider").notNull().default("vercel"),
    embeddingModel: text("embedding_model").notNull().default("openai/text-embedding-3-small"),
    chatModel: text("chat_model").notNull().default("openai/gpt-4o-mini"),
    scheduledSyncEnabled: boolean("scheduled_sync_enabled").notNull().default(false),
    dailyBriefEnabled: boolean("daily_brief_enabled").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("settings_user_id_unique_idx").on(table.userId)],
)
