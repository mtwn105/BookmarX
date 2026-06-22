import Link from "next/link"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { BookmarkCard } from "@/components/bookmark-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getBookmarks, getFolders } from "@/lib/api"

export default async function FoldersPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>
}) {
  const { folder: selectedId } = await searchParams
  const [folders, bookmarks] = await Promise.all([
    getFolders(),
    selectedId ? getBookmarks({ folderId: selectedId, limit: 100 }) : Promise.resolve([]),
  ])
  const selected = folders.find((folder) => folder.id === selectedId)
  const selectedBookmarks = selected ? bookmarks : []

  if (selected) {
    return (
      <div className="space-y-6">
        <div>
          <Link className="text-sm text-muted-foreground hover:text-foreground" href="/app/folders">
            ← All folders
          </Link>
          <div className="mt-4 flex items-center gap-3">
            <span className="size-4 rounded" style={{ backgroundColor: selected.color ?? undefined }} />
            <h1 className="text-3xl font-semibold tracking-[-0.035em]">{selected.name}</h1>
          </div>
          <p className="mt-2 text-muted-foreground">{selected.bookmarkCount} automatically classified bookmarks</p>
        </div>
        <section className="grid items-start gap-4 lg:grid-cols-2">
          {selectedBookmarks.map((row) => (
            <BookmarkCard key={row.bookmark.id} row={row} />
          ))}
          {selectedBookmarks.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No bookmarks have been classified here yet.
            </div>
          ) : null}
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Smart folders</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Browse by subject</h1>
        <p className="mt-2 text-muted-foreground">A stable taxonomy keeps your archive organized without folder maintenance.</p>
      </div>
      <section className="grid gap-3 sm:grid-cols-2">
        {folders.map((folder) => (
          <Link href={`/app/folders?folder=${folder.id}`} key={folder.id}>
            <Card className="h-full transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md" size="sm">
              <CardHeader className="grid-cols-[1fr_auto]">
                <div className="flex items-center gap-3">
                  <span className="size-3 rounded-sm" style={{ backgroundColor: folder.color ?? undefined }} />
                  <CardTitle>{folder.name}</CardTitle>
                </div>
                <HugeiconsIcon icon={ArrowRight01Icon} size={17} />
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {folder.bookmarkCount} {folder.bookmarkCount === 1 ? "bookmark" : "bookmarks"}
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  )
}
