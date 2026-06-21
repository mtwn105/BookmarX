import { notFound } from "next/navigation"

import { Button, buttonVariants } from "@/components/ui/button"
import { getBookmark, xPostUrl } from "@/lib/api"

import { archiveBookmark, updateBookmarkNote } from "../../actions"

export default async function BookmarkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const row = await getBookmark(id)

  if (!row) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2.5rem] border border-white/15 bg-background/85 p-5 shadow-2xl shadow-black/5 backdrop-blur-xl md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {row.author ? `@${row.author.username}` : "Saved post"}
            </p>
            <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight tracking-[-0.05em] md:text-5xl">{row.post.text}</h1>
          </div>
          <span className="w-fit rounded-full border border-border bg-muted px-4 py-2 text-sm text-muted-foreground">{row.bookmark.status}</span>
        </div>
        <div className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-4">
          <Metric label="Likes" value={row.post.likeCount ?? 0} />
          <Metric label="Reposts" value={row.post.repostCount ?? 0} />
          <Metric label="Replies" value={row.post.replyCount ?? 0} />
          <Metric label="Bookmarks" value={row.post.bookmarkCount ?? 0} />
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <a className={buttonVariants({ variant: "secondary" })} href={xPostUrl(row.post)} rel="noreferrer" target="_blank">
            Open on X
          </a>
          <form action={archiveBookmark}>
            <input name="id" type="hidden" value={row.bookmark.id} />
            <Button className="rounded-full" type="submit" variant="outline">
              Archive
            </Button>
          </form>
        </div>
      </section>
      <section className="rounded-[2rem] border border-white/15 bg-background/80 p-5 shadow-xl shadow-black/5 backdrop-blur-xl md:p-6">
        <h2 className="text-xl font-semibold tracking-[-0.03em]">Private note</h2>
        <form action={updateBookmarkNote} className="mt-4 space-y-4">
          <input name="id" type="hidden" value={row.bookmark.id} />
          <textarea
            className="min-h-36 w-full rounded-3xl border border-border bg-background p-4 outline-none ring-ring/20 transition focus:ring-4"
            defaultValue={row.bookmark.note ?? ""}
            name="note"
            placeholder="Add why this bookmark matters..."
          />
          <Button className="rounded-full" type="submit">
            Save note
          </Button>
        </form>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/35 p-4">
      <p className="text-2xl font-semibold text-foreground">{value.toLocaleString()}</p>
      <p>{label}</p>
    </div>
  )
}
