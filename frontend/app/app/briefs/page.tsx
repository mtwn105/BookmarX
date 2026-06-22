import { Calendar01Icon, SparklesIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getBriefs } from "@/lib/api"
import { generateDailyBrief } from "../actions"

export default async function BriefsPage() {
  const briefs = await getBriefs()
  const [latest, ...archive] = briefs

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-ai">Intelligent briefs</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">What deserves another look</h1>
          <p className="mt-2 text-muted-foreground">
            Automatic editorial summaries connect the ideas, tools, and themes in recent bookmarks.
          </p>
        </div>
        <form action={generateDailyBrief}>
          <Button type="submit">
            <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />
            Generate brief
          </Button>
        </form>
      </div>

      {latest ? (
        <article className="mx-auto max-w-3xl">
          <Card className="gap-0 border-border bg-white shadow-[0_18px_60px_rgba(13,19,43,0.06)]">
            <CardHeader className="pb-6">
              <div className="flex items-center gap-2">
                <Badge className="bg-ai/10 text-ai" variant="secondary">Latest brief</Badge>
                <time className="text-xs text-muted-foreground" dateTime={latest.generatedFor}>
                  {formatBriefDate(latest.generatedFor)}
                </time>
              </div>
              <CardTitle className="mt-4 max-w-2xl text-2xl font-semibold tracking-[-0.025em] sm:text-3xl">{latest.title}</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="py-6">
              <BriefContent content={latest.content} />
            </CardContent>
          </Card>
        </article>
      ) : (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-muted">
            <HugeiconsIcon icon={Calendar01Icon} size={22} />
          </div>
          <h2 className="mt-4 font-medium">No brief yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Enable daily briefs in Settings. The worker will create one from your recently synced bookmarks.
          </p>
        </div>
      )}

      {archive.length > 0 ? (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground">Previous briefs</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {archive.map((brief) => (
              <Card className="transition-[border-color,box-shadow] hover:border-ai/20 hover:shadow-md" key={brief.id} size="sm">
                <CardHeader>
                  <time className="text-xs text-muted-foreground">{formatBriefDate(brief.generatedFor)}</time>
                  <CardTitle className="mt-1">{brief.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {brief.content.replace(/[#*[\]]/g, "")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function BriefContent({ content }: { content: string }) {
  return (
    <div className="brief-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

function formatBriefDate(value: string) {
  return new Date(value).toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}
