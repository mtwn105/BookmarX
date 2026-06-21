import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import type { BookmarkRow } from "@/lib/api"
import { cn } from "@/lib/utils"

export function BookmarkCard({ row, compact = false }: { row: BookmarkRow; compact?: boolean }) {
  const author = row.author

  return (
    <article className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-card/80 p-5 shadow-[0_18px_80px_rgba(10,10,10,0.08)] ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-[0_24px_100px_rgba(10,10,10,0.12)] dark:bg-card/70 dark:ring-white/10">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {author ? `@${author.username}` : "Saved post"}
          </p>
          <h2 className={cn("mt-3 leading-snug", compact ? "text-base" : "text-xl font-semibold")}>{row.post.text}</h2>
        </div>
        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
          {row.bookmark.status}
        </span>
      </div>
      {row.bookmark.aiSummary ? <p className="mt-4 text-sm text-muted-foreground">{row.bookmark.aiSummary}</p> : null}
      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{row.post.likeCount ?? 0} likes</span>
        <span>·</span>
        <span>{row.post.repostCount ?? 0} reposts</span>
        <span>·</span>
        <span>{row.post.replyCount ?? 0} replies</span>
      </div>
      <div className="mt-5 flex gap-2">
        <Link className={buttonVariants({ size: "sm", variant: "secondary" })} href={`/app/bookmarks/${row.bookmark.id}`}>
          Details
        </Link>
        <a className={buttonVariants({ size: "sm", variant: "ghost" })} href={`https://x.com/i/web/status/${row.post.xPostId}`} rel="noreferrer" target="_blank">
          Open X
        </a>
      </div>
    </article>
  )
}
