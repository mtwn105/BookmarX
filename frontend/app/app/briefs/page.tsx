import { Button } from "@/components/ui/button"
import { getAnalyticsOverview, getBriefs } from "@/lib/api"

import { generateDailyBrief } from "../actions"

export default async function BriefsPage() {
  const [briefs, analytics] = await Promise.all([getBriefs(), getAnalyticsOverview()])

  return (
    <div className="space-y-6">
      <section className="rounded-[2.25rem] border border-white/15 bg-background/80 p-5 shadow-2xl shadow-black/5 backdrop-blur-xl md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Briefs</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] md:text-6xl">Resurface what matters.</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Generate a concise AI brief from your saved bookmarks. Scheduled delivery comes after the manual flow is solid.
            </p>
          </div>
          <form action={generateDailyBrief}>
            <Button className="h-12 rounded-full px-6" type="submit">
              Generate brief
            </Button>
          </form>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <Metric label="Bookmarks" value={analytics.bookmarks} />
          <Metric label="Archived" value={analytics.archived} />
          <Metric label="Briefs" value={analytics.briefs} />
          <Metric label="Sync jobs" value={analytics.syncJobs} />
        </div>
      </section>
      <section className="space-y-4">
        {briefs.length > 0 ? (
          briefs.map((brief) => (
            <article className="rounded-[2rem] border border-white/15 bg-card/80 p-5 shadow-xl shadow-black/5 backdrop-blur-xl md:p-6" key={brief.id}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {new Date(brief.generatedFor).toLocaleDateString()}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{brief.title}</h2>
              <div className="mt-4 whitespace-pre-wrap leading-7 text-muted-foreground">{brief.content}</div>
            </article>
          ))
        ) : (
          <div className="rounded-[2rem] border border-dashed border-border bg-background/70 p-8 text-center text-muted-foreground">
            No briefs yet. Generate one after syncing bookmarks.
          </div>
        )}
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/35 p-4">
      <p className="text-2xl font-semibold text-foreground">{value.toLocaleString()}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
