import Link from "next/link"
import {
  Bookmark02Icon,
  Comment01Icon,
  FavouriteIcon,
  RepostIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { LinkPreview, PostContent } from "@/components/post-content"
import { MediaGallery } from "@/components/media-gallery"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import type { BookmarkRow, PostMedia, QuotedPost } from "@/lib/api"
import { cn } from "@/lib/utils"

export function BookmarkCard({
  row,
  compact = false,
  showSummary = true,
}: {
  row: BookmarkRow
  compact?: boolean
  showSummary?: boolean
}) {
  return (
    <Card
      className="relative h-full overflow-visible py-0 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_16px_40px_rgba(37,99,235,0.08)]"
      size={compact ? "sm" : "default"}
    >
      <Link
        aria-label={`Open bookmark by ${row.author?.displayName ?? row.author?.username ?? "unknown author"}`}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        href={`/app/bookmarks/${row.bookmark.id}`}
      />
      <CardHeader className={cn("grid-cols-[auto_1fr_auto] items-start gap-3 px-4 pt-4", !compact && "sm:px-5 sm:pt-5")}>
        <AuthorAvatar author={row.author} />
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5">
            <span className="truncate font-semibold">{row.author?.displayName ?? row.author?.username ?? "Unknown author"}</span>
            {row.author ? <span className="truncate text-muted-foreground">@{row.author.username}</span> : null}
            {row.post.postedAt ? (
              <>
                <span className="text-muted-foreground">·</span>
                <time className="text-muted-foreground" dateTime={row.post.postedAt}>
                  {formatPostDate(row.post.postedAt)}
                </time>
              </>
            ) : null}
          </div>
          {row.folders[0] ? (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-sm" style={{ backgroundColor: row.folders[0].color ?? undefined }} />
              {row.folders[0].name}
            </div>
          ) : row.bookmark.aiSummary ? null : (
            <p className="mt-1 text-xs text-muted-foreground">AI organization pending</p>
          )}
          {row.threadPosts.length > 1 ? (
            <Badge className="mt-2 border-primary/15 bg-secondary text-primary" variant="outline">
              Thread · {row.threadPosts.length} posts
            </Badge>
          ) : null}
        </div>
        <Link
          className="relative z-20 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          href={`/app/bookmarks/${row.bookmark.id}`}
        >
          Details
        </Link>
      </CardHeader>

      <CardContent className={cn("px-4 pb-0", !compact && "sm:px-5")}>
        {row.threadPosts.length > 1 ? (
          <Thread postId={row.post.id} posts={row.threadPosts} />
        ) : (
          <PostBody
            compact={compact}
            media={row.media}
            quotedPost={row.quotedPost}
            text={row.post.text}
            urls={row.urls}
          />
        )}

        {showSummary && row.bookmark.aiSummary ? (
          <div className="mt-4 rounded-xl border border-ai/10 bg-ai/[0.055] px-3.5 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ai">AI summary</p>
            <p className="mt-1.5 text-sm leading-5 text-foreground/85">{row.bookmark.aiSummary}</p>
          </div>
        ) : null}

        {row.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {row.tags.map((tag) => (
              <Badge key={tag.id} variant="secondary">
                {tag.name}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>

      <CardFooter className={cn("justify-between px-4 py-3 text-muted-foreground", !compact && "sm:px-5")}>
        <Metric icon={Comment01Icon} value={row.post.replyCount} />
        <Metric icon={RepostIcon} value={row.post.repostCount} />
        <Metric icon={FavouriteIcon} value={row.post.likeCount} />
        <Metric icon={Bookmark02Icon} value={row.post.bookmarkCount} />
        <Metric icon={ViewIcon} value={getImpressionCount(row.post.rawJson)} />
      </CardFooter>
    </Card>
  )
}

function PostBody({
  text,
  urls,
  media,
  quotedPost,
  compact = false,
}: {
  text: string
  urls: BookmarkRow["urls"]
  media: PostMedia[]
  quotedPost?: QuotedPost | null
  compact?: boolean
}) {
  return (
    <>
      <PostContent
        className={cn(
          "whitespace-pre-wrap break-words leading-6 text-foreground",
          compact ? "text-sm" : "text-[15px] sm:text-base",
        )}
        text={text}
        urls={urls}
      />
      <MediaGallery media={media} />
      {quotedPost ? <QuotedPostCard quoted={quotedPost} /> : null}
      <LinkPreview urls={urls} />
    </>
  )
}

function Thread({ posts, postId }: { posts: BookmarkRow["threadPosts"]; postId: string }) {
  return (
    <div className="space-y-0">
      {posts.map((threadPost, index) => (
        <div className="relative pb-5 last:pb-0" key={threadPost.post.id}>
          {index < posts.length - 1 ? (
            <span className="absolute bottom-0 left-[5px] top-7 w-px bg-border" />
          ) : null}
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("size-2.5 rounded-full bg-[#c7d2e3]", threadPost.post.id === postId && "bg-primary ring-4 ring-primary/10")} />
            <time dateTime={threadPost.post.postedAt ?? undefined}>
              {threadPost.post.postedAt
                ? new Date(threadPost.post.postedAt).toLocaleString("en", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : `Part ${index + 1}`}
            </time>
            {threadPost.post.id === postId ? <span>· bookmarked</span> : null}
          </div>
          <div className="pl-4">
            <PostBody
              compact
              media={threadPost.media}
              text={threadPost.post.text}
              urls={threadPost.urls}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function AuthorAvatar({ author }: { author: BookmarkRow["author"] }) {
  return (
    <Avatar className="size-10">
      <AvatarImage alt={author?.displayName ?? author?.username ?? "Author"} src={author?.avatarUrl ?? undefined} />
      <AvatarFallback>{(author?.displayName ?? author?.username ?? "X").slice(0, 1).toUpperCase()}</AvatarFallback>
    </Avatar>
  )
}

function QuotedPostCard({ quoted }: { quoted: QuotedPost }) {
  return (
    <div className="mt-3 rounded-xl border p-3">
      <div className="flex items-center gap-2">
        <Avatar size="sm">
          <AvatarImage alt={quoted.author?.username ?? "Author"} src={quoted.author?.avatarUrl ?? undefined} />
          <AvatarFallback>{(quoted.author?.displayName ?? quoted.author?.username ?? "X").slice(0, 1)}</AvatarFallback>
        </Avatar>
        <span className="truncate text-sm font-semibold">
          {quoted.author?.displayName ?? quoted.author?.username ?? "Unknown author"}
        </span>
        {quoted.author ? <span className="truncate text-sm text-muted-foreground">@{quoted.author.username}</span> : null}
      </div>
      <PostContent className="mt-2 whitespace-pre-wrap text-sm leading-5" text={quoted.post.text} urls={quoted.urls} />
      <MediaGallery media={quoted.media} />
    </div>
  )
}

function Metric({
  icon,
  value,
}: {
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"]
  value: number | null | undefined
}) {
  if (!value) {
    return <span className="size-8" />
  }

  return (
    <span className="flex items-center gap-1 text-xs tabular-nums">
      <HugeiconsIcon icon={icon} size={15} strokeWidth={1.8} />
      {compactNumber(value)}
    </span>
  )
}

function getImpressionCount(rawJson: Record<string, unknown> | undefined) {
  const metrics = rawJson?.public_metrics
  if (!metrics || typeof metrics !== "object" || !("impression_count" in metrics)) {
    return null
  }
  return typeof metrics.impression_count === "number" ? metrics.impression_count : null
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value)
}

function formatPostDate(value: string) {
  const date = new Date(value)
  const now = new Date()
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en", { month: "short", day: "numeric" })
  }
  return date.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })
}
