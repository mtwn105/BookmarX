<div align="center">
  <h1>BookmarX</h1>
  <p>
    <strong>Open-source, self-hosted AI-powered bookmark manager for X/Twitter</strong>
  </p>
  <p>
    <a href="#features">Features</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#documentation">Docs</a> •
    <a href="CONTRIBUTING.md">Contributing</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">
    <img src="https://img.shields.io/badge/bun-1.3+-orange.svg" alt="Bun">
    <img src="https://img.shields.io/badge/Next.js-16-black.svg" alt="Next.js">
  </p>
</div>

Sync your X bookmarks, organize them with AI-powered folders and tags, index them for semantic search, and chat with your library — all self-hosted.

## Features

- **X/Twitter Sync** — Import your bookmarks via the X API v2 with OAuth 2.0 PKCE
- **AI Organization** — Bookmarks are auto-classified into folders, tagged, and summarized using LLMs
- **Semantic Search** — pgvector embeddings power natural-language search across your library
- **AI Chat** — Ask questions over your bookmarks with source citations (RAG)
- **Daily Briefs** — AI-generated summaries of recent bookmarks
- **Thread Support** — Full thread reconstruction with media, quoted posts, and note_tweet rendering
- **Media Gallery** — Images and videos from Twitter served with proxy and range support
- **Self-Hosted** — Deploy anywhere with Docker Compose; your data stays on your infrastructure
- **Folders & Tags** — Manual or AI-driven organization with a preset taxonomy

## Quick Start

### Prerequisites

- [Docker](https://docker.com) + [Docker Compose](https://docs.docker.com/compose/)
- An [X Developer App](https://developer.x.com/) with OAuth 2.0 enabled
- An [OpenAI API key](https://platform.openai.com/api-keys) (or another AI provider supported by Vercel AI SDK)

### One-liner

```bash
git clone https://github.com/mtwn105/BookmarX.git
cd BookmarX
cp .env.example .env
# Edit .env with your X_CLIENT_ID, X_CLIENT_SECRET, AI_API_KEY, ENCRYPTION_KEY
docker compose up -d
docker compose exec backend bun run db:migrate
```

Then open **http://localhost:3000**, connect your X account, and start syncing.

### Local Development

```bash
bun install                     # Install dependencies (Bun workspaces)
docker compose up postgres redis -d  # Start infra
bun run dev:backend             # Hono API on :4000
bun --cwd backend run worker     # BullMQ worker
bun run dev:frontend             # Next.js on :3000
```

See the full guide in [`docs/self-hosting.md`](docs/self-hosting.md) and [`docs/x-api-setup.md`](docs/x-api-setup.md).

## Architecture

```
                    ┌─────────────┐
                    │  Frontend   │
                    │  Next.js 16 │─────┐
                    │  :3000      │     │
                    └─────────────┘     │
                              │         │
                              │ API     │ Server Actions
                              ▼         ▼
                    ┌──────────────────────┐
                    │    Backend (Hono)     │
                    │  :4000                │
                    │  Routes / Auth / AI   │
                    └──┬───────┬───────────┘
                       │       │
                       ▼       ▼
              ┌──────────┐  ┌──────┐
              │ PostgreSQL│  │ Redis│
              │ +pgvector │  │      │
              └──────────┘  └──────┘
                       │
              ┌────────┴────────┐
              │  Worker (Hono)  │
              │  BullMQ queues  │
              │  Sync / AI jobs │
              └─────────────────┘
```

| Service | Role | Stack |
|---|---|---|
| **Frontend** | Web UI | Next.js 16, React 19, shadcn/ui, Tailwind CSS v4 |
| **Backend** | REST API, auth | Hono, Drizzle ORM, Zod |
| **Worker** | Background jobs | BullMQ, Vercel AI SDK |
| **PostgreSQL** | Primary DB + vectors | pgvector (HNSW index) |
| **Redis** | Queue backend | BullMQ |

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | [Bun](https://bun.sh) 1.3+ |
| **Frontend** | [Next.js](https://nextjs.org) 16, [React](https://react.dev) 19, [shadcn/ui](https://ui.shadcn.com), [Tailwind CSS](https://tailwindcss.com) v4, [next-themes](https://github.com/pacocoursey/next-themes) |
| **Backend** | [Hono](https://hono.dev), [Drizzle ORM](https://orm.drizzle.team), [Zod](https://zod.dev) |
| **AI** | [Vercel AI SDK](https://sdk.vercel.ai), [OpenAI](https://openai.com) (pluggable) |
| **Database** | [PostgreSQL](https://postgresql.org) 16 + [pgvector](https://github.com/pgvector/pgvector) |
| **Queue** | [BullMQ](https://bullmq.io) + [Redis](https://redis.io) |
| **Auth** | X OAuth 2.0 PKCE, session tokens, AES-256-GCM encryption |
| **Search** | Cosine similarity via pgvector (1536-dim embeddings) |

## Project Structure

```
BookmarX/
├── backend/               # Hono API + BullMQ worker
│   ├── src/
│   │   ├── ai/            # Embeddings, LLM, taxonomy
│   │   ├── auth/          # X OAuth, sessions, encryption
│   │   ├── briefs/        # Daily brief generation
│   │   ├── config/        # Environment variables (Zod)
│   │   ├── db/            # Schema, client, migrations
│   │   ├── http/          # Routes & middleware
│   │   │   └── routes/    # auth, bookmarks, folders, tags, ai, sync, ...
│   │   ├── jobs/          # Job processors
│   │   ├── queues/        # BullMQ definitions
│   │   ├── settings/      # User settings
│   │   └── x/             # X API client
│   └── Dockerfile
├── frontend/              # Next.js app
│   ├── app/               # App Router (pages + API routes)
│   ├── components/        # React components + shadcn/ui
│   └── lib/               # API client, utils
├── docs/                  # Documentation
├── docker-compose.yml     # Full-stack deployment
└── package.json           # Bun workspace root
```

## Documentation

| Document | Description |
|---|---|
| [`docs/self-hosting.md`](docs/self-hosting.md) | Full deployment guide |
| [`docs/x-api-setup.md`](docs/x-api-setup.md) | X Developer app setup |
| [`docs/ai-providers.md`](docs/ai-providers.md) | AI provider configuration |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Contribution guidelines |

## Status

BookmarX is in active development. See the [GitHub Issues](https://github.com/mtwn105/BookmarX/issues) for planned work and [open issues](https://github.com/mtwn105/BookmarX/issues).

## License

[MIT](LICENSE) © BookmarX
