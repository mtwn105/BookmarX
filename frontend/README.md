# BookmarX Frontend

Next.js 16 web app for BookmarX — the AI-powered bookmark manager.

## Pages

| Route | File | Description |
|---|---|---|
| `/` | `app/page.tsx` | Landing — connect X or open library |
| `/app` | `app/app/page.tsx` | Library grid with bookmarks + filters |
| `/app/bookmarks/[id]` | `app/app/bookmarks/[id]/page.tsx` | Bookmark detail |
| `/app/ask` | `app/app/ask/page.tsx` | AI chat over your bookmarks |
| `/app/briefs` | `app/app/briefs/page.tsx` | Daily AI-generated briefs |
| `/app/folders` | `app/app/folders/page.tsx` | Folder organization |
| `/app/search` | `app/app/search/page.tsx` | Full-text search |
| `/app/settings` | `app/app/settings/page.tsx` | Sync & brief preferences |

## API Routes (Next.js)

| Route | Purpose |
|---|---|
| `/api/ai/chat/stream` | Proxies streaming AI chat to backend |
| `/api/media/video` | Proxies Twitter video with range support |
| `/api/sync/status` | Proxies sync status to backend |

## Scripts

```bash
bun run dev          # Development server on :3000
bun run build        # Production build
bun run start        # Start production server
bun run lint         # ESLint
bun run typecheck    # TypeScript type check
```

## Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, shadcn/ui, Tailwind CSS v4
- **Icons:** Hugeicons Core Free
- **Theme:** next-themes (light/dark)
- **API client:** Custom fetch wrapper in `lib/api.ts`
