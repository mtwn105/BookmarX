import { BookmarkCard } from "@/components/bookmark-card"
import { Button } from "@/components/ui/button"
import { getBookmarks, getSyncJobs } from "@/lib/api"

import { startSync } from "./actions"

export default async function LibraryPage() {
  const [bookmarks, syncJobs] = await Promise.all([getBookmarks(), getSyncJobs()])
  const latestSync = syncJobs[0]

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2.25rem] border border-white/15 bg-background/80 p-5 shadow-2xl shadow-black/5 backdrop-blur-xl md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Library</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] md:text-6xl">Your saved signal.</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Sync X bookmarks, review the newest posts, and prepare them for folders, tags, search, and AI retrieval.
            </p>
          </div>
          <form action={startSync}>
            <Button className="h-12 rounded-full px-6" type="submit">
              Sync X bookmarks
            </Button>
          </form>
        </div>
        {latestSync ? (
          <div className="mt-6 rounded-2xl border border-border bg-muted/35 p-4 text-sm text-muted-foreground">
            Latest sync: <strong className="text-foreground">{latestSync.status}</strong> · {latestSync.resourcesFetched} resources · estimated ${""}
            {(latestSync.estimatedCostMicros / 1_000_000).toFixed(4)}
          </div>
        ) : null}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        {bookmarks.length > 0 ? (
          bookmarks.map((row) => <BookmarkCard key={row.bookmark.id} row={row} />)
        ) : (
          <div className="rounded-[2rem] border border-dashed border-border bg-background/70 p-8 text-center text-muted-foreground lg:col-span-2">
            No bookmarks synced yet. Connect X and run your first sync.
          </div>
        )}
      </section>
    </div>
  )
}
