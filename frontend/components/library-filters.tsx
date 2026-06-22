import Link from "next/link"
import { FilterHorizontalIcon, Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { BookmarkFilterOptions, BookmarkFilters, Folder } from "@/lib/api"

const contentTypes = ["post", "thread", "link", "media", "idea", "code", "research", "news"] as const
type FilterOption = { label: string; value: string }

export function LibraryFilters({
  filters,
  folders,
  options,
}: {
  filters: BookmarkFilters
  folders: Folder[]
  options: BookmarkFilterOptions
}) {
  return (
    <Card className="border-border/80 shadow-[0_8px_30px_rgba(13,19,43,0.025)]" size="sm">
      <CardContent className="py-1">
        <form className="space-y-3">
          <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(16rem,2fr)_minmax(10rem,1fr)_minmax(10rem,1fr)]">
            <div className="relative min-w-0 flex-1">
              <HugeiconsIcon
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                icon={Search01Icon}
                size={17}
              />
              <Input className="pl-9" defaultValue={filters.q} name="q" placeholder="Search your library…" />
            </div>
            <FilterSelect
              defaultValue={filters.sort ?? "newest"}
              name="sort"
              options={[
                { label: "Newest first", value: "newest" },
                { label: "Oldest first", value: "oldest" },
              ]}
            />
            <FilterSelect
              defaultValue={filters.media ?? "all"}
              name="media"
              options={[
                { label: "Any media", value: "all" },
                { label: "With media", value: "with" },
                { label: "Without media", value: "without" },
              ]}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect
              defaultValue={filters.folderId ?? "all"}
              name="folderId"
              options={[
                { label: "All folders", value: "all" },
                ...folders.map((folder) => ({ label: folder.name, value: folder.id })),
              ]}
            />
            <FilterSelect
              defaultValue={filters.tagId ?? "all"}
              name="tagId"
              options={[
                { label: "All tags", value: "all" },
                ...options.tags.map((tag) => ({ label: tag.name, value: tag.id })),
              ]}
            />
            <FilterSelect
              defaultValue={filters.author ?? "all"}
              name="author"
              options={[
                { label: "All authors", value: "all" },
                ...options.authors.map((author) => ({
                  label: `@${author.username}`,
                  value: author.username,
                })),
              ]}
            />
            <FilterSelect
              defaultValue={filters.contentType ?? "all"}
              name="contentType"
              options={[
                { label: "All content", value: "all" },
                ...contentTypes.map((type) => ({
                  label: type[0].toUpperCase() + type.slice(1),
                  value: type,
                })),
              ]}
            />
          </div>

          <div className="grid items-end gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]">
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Posted from
              <Input defaultValue={filters.postedFrom} name="postedFrom" type="date" />
            </label>
            <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Posted to
              <Input defaultValue={filters.postedTo} name="postedTo" type="date" />
            </label>
            <Button type="submit">
              <HugeiconsIcon icon={FilterHorizontalIcon} />
              Apply filters
            </Button>
            <Button render={<Link href="/app" />} variant="ghost">
              Clear
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function FilterSelect({
  name,
  defaultValue,
  options,
}: {
  name: string
  defaultValue: string
  options: FilterOption[]
}) {
  return (
    <Select defaultValue={defaultValue} items={options} name={name}>
      <SelectTrigger className="min-w-0 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
