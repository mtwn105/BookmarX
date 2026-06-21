# BookmarX Backend

Hono API and worker service for BookmarX.

## Scripts

```bash
bun install
bun run dev
bun run worker
bun run db:migrate
bun run typecheck
```

## Current Routes

- `GET /health` checks that the API process is running.

The next implementation phase adds Drizzle, auth, X bookmark sync, and the job queue.
