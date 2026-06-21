# BookmarX

BookmarX is an open-source, self-hosted AI-powered bookmark manager for X/Twitter. It syncs your X bookmarks, organizes them into folders and tags, indexes them for search, and lets you ask AI questions over your saved posts with source citations.

## Status

BookmarX is in early development. The repository currently contains the frontend starter app, the initial Hono backend skeleton, Docker Compose services, and the technical implementation plan.

## Architecture

- `frontend/`: Next.js mobile-first web app
- `backend/`: Hono API and worker service
- `postgres`: PostgreSQL with `pgvector`
- `redis`: queue backend for sync and AI jobs

## Local Development

Copy the environment example:

```bash
cp .env.example .env
```

Install dependencies from the root when using Bun workspaces:

```bash
bun install
```

Run the backend:

```bash
bun run dev:backend
```

Run the frontend:

```bash
bun run dev:frontend
```

Start self-hosting dependencies:

```bash
docker compose up postgres redis
```

## Self-Hosting Target

The intended self-hosted deployment uses Docker Compose:

```bash
docker compose up -d
```

The app requires your own X Developer app credentials and AI provider key. See `docs/plans/2026-06-21-bookmarx-technical-plan.md` for the full implementation plan.

## Docs

- `docs/self-hosting.md`
- `docs/x-api-setup.md`
- `docs/ai-providers.md`
