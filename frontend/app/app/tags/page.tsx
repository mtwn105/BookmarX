import { Button } from "@/components/ui/button"
import { getTags } from "@/lib/api"

import { createTag } from "../actions"

export default async function TagsPage() {
  const tags = await getTags()

  return (
    <div className="space-y-6">
      <section className="rounded-[2.25rem] border border-white/15 bg-background/80 p-5 shadow-2xl shadow-black/5 backdrop-blur-xl md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Tags</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] md:text-6xl">Name patterns.</h1>
        <form action={createTag} className="mt-6 grid gap-3 sm:grid-cols-[1fr_10rem_auto]">
          <input className="h-12 rounded-full border border-border bg-background px-5 outline-none ring-ring/20 focus:ring-4" name="name" placeholder="Tag name" />
          <input className="h-12 rounded-full border border-border bg-background px-5 outline-none ring-ring/20 focus:ring-4" name="color" placeholder="#0f766e" />
          <Button className="h-12 rounded-full px-6" type="submit">
            Add
          </Button>
        </form>
      </section>
      <section className="flex flex-wrap gap-3">
        {tags.map((tag) => (
          <div className="rounded-full border border-border bg-background/80 px-4 py-3 shadow-lg shadow-black/5" key={tag.id}>
            <span className="mr-2 inline-block size-2 rounded-full" style={{ backgroundColor: tag.color ?? "currentColor" }} />
            {tag.name}
          </div>
        ))}
      </section>
    </div>
  )
}
