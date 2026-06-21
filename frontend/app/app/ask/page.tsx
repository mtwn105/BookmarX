import { BookmarkCard } from "@/components/bookmark-card"
import { Button } from "@/components/ui/button"
import { askBookmarks, getBookmark } from "@/lib/api"

export default async function AskPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams
  const result = q ? await askBookmarks(q) : null
  const sourceBookmarks = result
    ? await Promise.all(result.sources.slice(0, 4).map((source) => getBookmark(source.bookmarkId)))
    : []

  return (
    <div className="space-y-6">
      <section className="rounded-[2.25rem] border border-white/15 bg-background/80 p-5 shadow-2xl shadow-black/5 backdrop-blur-xl md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">AI over bookmarks</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] md:text-6xl">Ask your archive.</h1>
        <form className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            className="h-12 flex-1 rounded-full border border-border bg-background px-5 text-base outline-none ring-ring/20 transition focus:ring-4"
            defaultValue={q}
            name="q"
            placeholder="What did I save about agents, pricing, ideas..."
          />
          <Button className="h-12 rounded-full px-6" type="submit">
            Ask
          </Button>
        </form>
      </section>
      {result ? (
        <section className="rounded-[2.25rem] border border-white/15 bg-card/80 p-5 shadow-2xl shadow-black/5 backdrop-blur-xl md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Answer</p>
          <div className="mt-4 whitespace-pre-wrap text-lg leading-8">{result.answer}</div>
        </section>
      ) : null}
      {sourceBookmarks.length > 0 ? (
        <section className="space-y-4">
          <h2 className="px-2 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Cited bookmarks</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {sourceBookmarks.map((row) => (row ? <BookmarkCard compact key={row.bookmark.id} row={row} /> : null))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
