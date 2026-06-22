import { Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { BookmarkCard } from "@/components/bookmark-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getBookmarks } from "@/lib/api"

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams
  const bookmarks = q ? await getBookmarks(q) : []

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Search</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Find anything you saved</h1>
        <p className="mt-2 text-muted-foreground">Search post text, then use Chat when the question is conceptual.</p>
      </div>
      <form className="flex gap-2">
        <div className="relative flex-1">
          <HugeiconsIcon
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            icon={Search01Icon}
            size={17}
          />
          <Input autoFocus className="pl-9" defaultValue={q} name="q" placeholder="Search your archive…" />
        </div>
        <Button type="submit">Search</Button>
      </form>
      <section className="grid items-start gap-4 lg:grid-cols-2">
        {bookmarks.map((row) => (
          <BookmarkCard compact key={row.bookmark.id} row={row} />
        ))}
        {q && bookmarks.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No bookmarks matched “{q}”.
          </div>
        ) : null}
      </section>
    </div>
  )
}
