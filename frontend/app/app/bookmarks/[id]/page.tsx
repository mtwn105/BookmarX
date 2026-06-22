import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft01Icon, LinkSquare01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { BookmarkCard } from "@/components/bookmark-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { getBookmark, xPostUrl } from "@/lib/api"

import { updateBookmarkNote } from "../../actions"

export default async function BookmarkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const row = await getBookmark(id)

  if (!row) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <Button render={<Link href="/app" />} variant="ghost">
          <HugeiconsIcon icon={ArrowLeft01Icon} />
          Library
        </Button>
        <Button render={<a href={xPostUrl(row.post)} rel="noreferrer" target="_blank" />} variant="outline">
          Open on X
          <HugeiconsIcon icon={LinkSquare01Icon} />
        </Button>
      </div>

      <BookmarkCard row={row} />

      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle>Private note</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateBookmarkNote} className="space-y-3">
            <input name="id" type="hidden" value={row.bookmark.id} />
            <Textarea
              defaultValue={row.bookmark.note ?? ""}
              name="note"
              placeholder="Add your own context or why this matters…"
              rows={5}
            />
            <Button type="submit">Save note</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
