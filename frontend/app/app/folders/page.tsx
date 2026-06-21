import { Button } from "@/components/ui/button"
import { getFolders } from "@/lib/api"

import { createFolder } from "../actions"

export default async function FoldersPage() {
  const folders = await getFolders()

  return (
    <div className="space-y-6">
      <section className="rounded-[2.25rem] border border-white/15 bg-background/80 p-5 shadow-2xl shadow-black/5 backdrop-blur-xl md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Folders</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.06em] md:text-6xl">Create structure.</h1>
        <form action={createFolder} className="mt-6 grid gap-3 sm:grid-cols-[1fr_10rem_auto]">
          <input className="h-12 rounded-full border border-border bg-background px-5 outline-none ring-ring/20 focus:ring-4" name="name" placeholder="Folder name" />
          <input className="h-12 rounded-full border border-border bg-background px-5 outline-none ring-ring/20 focus:ring-4" name="color" placeholder="#111111" />
          <Button className="h-12 rounded-full px-6" type="submit">
            Add
          </Button>
        </form>
      </section>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {folders.map((folder) => (
          <div className="rounded-[2rem] border border-border bg-background/80 p-5 shadow-xl shadow-black/5" key={folder.id}>
            <div className="mb-4 size-10 rounded-full border border-border" style={{ backgroundColor: folder.color ?? "transparent" }} />
            <h2 className="text-xl font-semibold tracking-[-0.03em]">{folder.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sort order {folder.sortOrder}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
