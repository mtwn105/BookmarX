# BookmarX Technical Plan

BookmarX is a self-hosted, open-source AI-powered bookmark manager for X/Twitter. It syncs a user's X bookmarks, organizes them into folders and tags, indexes them for search, and uses retrieval-augmented generation to answer questions with citations from saved posts.

## Product Direction

The first version is self-hosted only. SaaS support can come later after the core sync, organization, search, and AI workflows are stable.

Self-hosting keeps the X API billing model clear: users bring their own X Developer app credentials and AI provider key. This avoids carrying hosted API costs and makes X Owned Reads more likely to apply for users fetching their own data through their own developer app.

## Architecture

Use a separate frontend and backend.

```txt
Browser
  -> Next.js frontend
  -> Hono backend API
  -> Postgres + pgvector

Hono worker
  -> X API
  -> AI provider
  -> Postgres

Redis
  -> background job queue
```

Repository layout:

```txt
BookmarX
├── frontend/          Next.js mobile-first app
├── backend/           Hono API and worker
├── docs/              technical and self-hosting docs
├── docker-compose.yml
└── .env.example
```

## Stack

- Frontend: Next.js, React, Tailwind CSS, shadcn-style components
- Backend: Hono, TypeScript, Node.js
- Database: PostgreSQL with pgvector
- ORM: Drizzle ORM
- Queue: BullMQ with Redis
- Validation: Zod
- AI: Vercel AI SDK or compatible provider SDKs
- Deployment: Docker Compose first

## X API Strategy

X API v2 uses pay-per-usage pricing. Current docs list most post reads around `$0.005` per resource, while Owned Reads for endpoints like `GET /2/users/{id}/bookmarks` are listed around `$0.001` per resource when the authenticated user owns the developer app and accesses their own data. Pricing is credit-based, tracked in the Developer Console, and subject to change.

Implementation rules:

- Users provide their own X app credentials in `.env`.
- Sync is manual by default.
- Scheduled sync is optional.
- Sync jobs track fetched resources and estimated cost.
- Existing bookmarks are cached locally and not re-fetched unnecessarily.
- Incremental sync uses stored checkpoints where possible.
- API responses are normalized and raw payloads are preserved for debugging.

## Core Features

MVP:

- X login
- Manual bookmark sync
- Bookmark feed
- Bookmark detail view
- Folder and tag organization
- Full-text search
- Semantic search
- AI Q&A with citations
- Docker Compose deployment

Next:

- Daily briefs
- AI suggested tags and summaries
- Local analytics
- Scheduled sync
- Import/export

Later:

- SaaS mode
- Browser extension
- Email digests
- Local Ollama mode
- Supermemory integration

## Backend API

Planned route groups:

- Auth: `/auth/x/start`, `/auth/x/callback`, `/auth/logout`, `/me`
- Bookmarks: `/bookmarks`, `/bookmarks/:id`, `/bookmarks/bulk`
- Sync: `/sync/x`, `/sync/jobs`, `/sync/jobs/:id`
- Folders: `/folders`, `/folders/:id`
- Tags: `/tags`, `/tags/:id`
- Search: `/search`, `/search/semantic`
- AI: `/ai/chat`, `/ai/summarize/:bookmarkId`, `/ai/suggest-tags/:bookmarkId`
- Briefs: `/briefs`, `/briefs/generate`
- Analytics: `/analytics/overview`, `/events`
- Health: `/health`

## Job Pipeline

Background jobs:

- `x.syncBookmarks`
- `bookmark.normalize`
- `bookmark.embed`
- `bookmark.classify`
- `brief.generateDaily`
- `cleanup.oldJobs`

Sync flow:

```txt
User starts sync
  -> create sync job
  -> fetch X bookmarks page by page
  -> upsert posts, bookmarks, authors, media, URLs
  -> enqueue embedding jobs for new/changed bookmarks
  -> enqueue classification jobs if enabled
  -> update sync status and estimated X API cost
```

## RAG Design

Use local RAG with Postgres and pgvector.

Ingestion:

1. Convert each bookmark into canonical text from post text, author, quoted post, thread context, resolved URLs, user folder, and tags.
2. Split text into chunks.
3. Generate embeddings.
4. Store chunks and vectors in Postgres.

Query:

1. Embed the user question.
2. Retrieve matching chunks by vector similarity.
3. Apply SQL filters for folder, tag, author, and date.
4. Generate an answer using retrieved context only.
5. Return source bookmark citations.

AI behavior:

- Do not invent bookmarks.
- If retrieved context is weak, say there was not enough matching saved content.
- Always cite source bookmarks.

## Data Model

Planned tables:

- `users`
- `x_accounts`
- `oauth_tokens`
- `bookmarks`
- `posts`
- `post_authors`
- `post_media`
- `post_urls`
- `folders`
- `tags`
- `bookmark_tags`
- `bookmark_folders`
- `bookmark_chunks`
- `bookmark_embeddings`
- `sync_jobs`
- `ai_jobs`
- `briefs`
- `events`
- `settings`

Important indexes:

- Unique `(user_id, x_post_id)` on bookmarks
- Full-text index on post text
- HNSW vector index on embeddings
- Common filters on `user_id`, `folder_id`, `tag_id`, `author_id`, and `created_at`

## Self-Hosting

Runtime services:

- `frontend`
- `backend`
- `worker`
- `postgres`
- `redis`

Required configuration:

```env
DATABASE_URL=
REDIS_URL=
X_CLIENT_ID=
X_CLIENT_SECRET=
X_REDIRECT_URI=
ENCRYPTION_KEY=
AI_PROVIDER=
AI_API_KEY=
EMBEDDING_MODEL=
CHAT_MODEL=
```

## Implementation Order

1. Add backend workspace, Hono health route, worker entrypoint, Docker Compose, and env examples.
2. Add Drizzle schema and migrations for users, X accounts, bookmarks, posts, folders, tags, jobs, and embeddings.
3. Implement X OAuth and encrypted token storage.
4. Implement manual X bookmark sync.
5. Build bookmark feed, detail page, folder/tag CRUD, and text search.
6. Add embedding pipeline, semantic search, and AI Q&A with citations.
7. Add briefs, analytics, and scheduled sync.
8. Polish self-hosting docs and setup checks.
