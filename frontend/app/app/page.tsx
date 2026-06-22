import { RefreshIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { BookmarkCard } from "@/components/bookmark-card"
import { LibraryFilters } from "@/components/library-filters"
import { SyncProgress } from "@/components/sync-progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  getBookmarkFilterOptions,
  getBookmarks,
  getFolders,
  getSyncJobs,
  getSyncStatus,
  type BookmarkFilters,
} from "@/lib/api"

import { startSync } from "./actions"

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<BookmarkFilters>
}) {
  const filters = await searchParams
  const [bookmarks, syncJobs, syncStatus, folders, filterOptions] = await Promise.all([
    getBookmarks({ ...filters, limit: 100 }),
    getSyncJobs(),
    getSyncStatus(),
    getFolders(),
    getBookmarkFilterOptions(),
  ])
  const latestSync = syncJobs[0]
  const syncInProgress = latestSync?.status === "queued" || latestSync?.status === "running"

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Library</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Your saved knowledge</h1>
          <p className="mt-2 text-muted-foreground">
            Automatically summarized, tagged, and organized when X syncs.
          </p>
        </div>
        <form action={startSync}>
          <Button disabled={syncInProgress} type="submit">
            <HugeiconsIcon className={syncInProgress ? "animate-spin" : ""} icon={RefreshIcon} strokeWidth={2} />
            {syncInProgress ? "Syncing…" : "Sync X"}
          </Button>
        </form>
      </div>

      <LibraryFilters filters={filters} folders={folders} options={filterOptions} />

      <SyncProgress initialStatus={syncStatus} />

      {latestSync?.status === "failed" ? (
        <Alert variant="destructive">
          <AlertTitle>Sync failed</AlertTitle>
          <AlertDescription>{latestSync.errorMessage ?? "Check the worker and X API configuration."}</AlertDescription>
        </Alert>
      ) : null}

      {latestSync?.status === "completed" ? (
        <p className="text-xs text-muted-foreground">
          Last synced {new Date(latestSync.finishedAt ?? latestSync.createdAt).toLocaleString()} ·{" "}
          {latestSync.resourcesFetched} posts fetched
        </p>
      ) : null}

      <section className="grid items-start gap-4 lg:grid-cols-2">
        {bookmarks.map((row) => (
          <BookmarkCard key={row.bookmark.id} row={row} />
        ))}
        {bookmarks.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center">
            <h2 className="font-medium">{filters.q ? "No matching bookmarks" : "Your library is empty"}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {filters.q ? "Try broader filters." : "Run your first X sync to build the library."}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  )
}
