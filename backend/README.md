# BookmarX Backend

Hono REST API and BullMQ worker for BookmarX.

## Services

Two entry points share this codebase:

| Entry | Command | Role |
|---|---|---|
| `src/index.ts` | `bun run dev` | Hono HTTP server on `:4000` |
| `src/worker.ts` | `bun run worker` | BullMQ worker (sync + AI queues) |

## Scripts

```bash
bun run dev          # Start API server (hot reload)
bun run worker       # Start background worker
bun run start        # Start API in production
bun run db:migrate   # Run Drizzle migrations
bun run typecheck    # TypeScript type check
bun run lint         # ESLint
```

## API Routes

| Prefix | File | Description |
|---|---|---|
| `GET /health` | — | Health check |
| `GET/POST /auth/x/*` | `routes/auth.ts` | X OAuth 2.0 PKCE flow |
| `GET /me` | `routes/auth.ts` | Current user |
| `GET/PATCH /bookmarks` | `routes/bookmarks.ts` | Bookmarks CRUD |
| `GET/POST /folders` | `routes/folders.ts` | Folder management |
| `GET/POST /tags` | `routes/tags.ts` | Tag management |
| `POST /search/semantic` | `routes/search.ts` | Semantic search |
| `POST /ai/*` | `routes/ai.ts` | AI chat, summarize, suggest tags |
| `GET /briefs` | `routes/briefs.ts` | Daily briefs |
| `GET/POST /sync/*` | `routes/sync.ts` | X sync + job status |
| `GET /analytics/overview` | `routes/analytics.ts` | Library statistics |
| `GET/PATCH /settings` | `routes/settings.ts` | User preferences |
| `GET /setup/status` | `routes/setup.ts` | Setup completion status |

## Architecture

```
API (index.ts)
  └─ Hono app (app.ts)
       ├─ require-user middleware
       └─ Resource routes

Worker (worker.ts)
  ├─ Sync queue  → sync-bookmarks, scheduled-sync
  └─ AI queue    → embed-bookmark, enrich-bookmark
```

## Stack

- **Runtime:** Bun
- **Framework:** Hono
- **ORM:** Drizzle + PostgreSQL + pgvector
- **Queue:** BullMQ + Redis
- **AI:** Vercel AI SDK (OpenAI default)
- **Auth:** X OAuth 2.0 PKCE, AES-256-GCM tokens, SHA-256 sessions
