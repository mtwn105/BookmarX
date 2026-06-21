import { BookmarkCard } from "@/components/bookmark-card"
import { Button } from "@/components/ui/button"
import { getBookmarks } from "@/lib/api"

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams
  const bookmarks = q ? await getBookmarks(q) : []

  return (
    <div className="space-y-6">
      <section className="rounded-[2.25rem] border border-white/15 bg-background/80 p-5 shadow-2xl shadow-black/5 backdrop-blur-xl md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Full-text search</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] md:text-6xl">Find saved posts fast.</h1>
        <form className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            className="h-12 flex-1 rounded-full border border-border bg-background px-5 text-base outline-none ring-ring/20 transition focus:ring-4"
            defaultValue={q}
            name="q"
            placeholder="Search by topic, phrase, author, or link..."
          />
          <Button className="h-12 rounded-full px-6" type="submit">
            Search
          </Button>
        </form>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        {q && bookmarks.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-border bg-background/70 p-8 text-center text-muted-foreground lg:col-span-2">
            No bookmarks matched “{q}”. Semantic search comes next in the RAG phase.
          </div>
        ) : null}
        {bookmarks.map((row) => (
          <BookmarkCard compact key={row.bookmark.id} row={row} />
        ))}
      </section>
    </div>
  )
}
