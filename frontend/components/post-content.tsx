import type { PostUrl } from "@/lib/api"
import { RemoteMediaImage } from "@/components/remote-media-image"

const entityPattern = /(https:\/\/t\.co\/\w+|https?:\/\/[^\s]+|[@#][$\p{L}\p{N}_]+)/gu

export function PostContent({
  text,
  urls,
  className,
}: {
  text: string
  urls: PostUrl[]
  className?: string
}) {
  const resolvedUrls = new Map(urls.map((url) => [url.url, url]))
  const parts = text.split(entityPattern)

  return (
    <p className={className}>
      {parts.map((part, index) => {
        const resolved = resolvedUrls.get(part)

        if (resolved || /^https?:\/\//.test(part)) {
          const href = resolved?.expandedUrl ?? part
          const label = resolved?.displayUrl ?? resolved?.title ?? part
          return (
            <a
            className="relative z-20 break-words text-primary hover:underline"
              href={href}
              key={`${part}-${index}`}
              rel="noreferrer"
              target="_blank"
            >
              {label}
            </a>
          )
        }

        if (part.startsWith("@")) {
          return (
            <a
              className="relative z-20 text-primary hover:underline"
              href={`https://x.com/${part.slice(1)}`}
              key={`${part}-${index}`}
              rel="noreferrer"
              target="_blank"
            >
              {part}
            </a>
          )
        }

        if (part.startsWith("#")) {
          return (
            <a
              className="relative z-20 text-primary hover:underline"
              href={`https://x.com/hashtag/${encodeURIComponent(part.slice(1))}`}
              key={`${part}-${index}`}
              rel="noreferrer"
              target="_blank"
            >
              {part}
            </a>
          )
        }

        return <span key={`${part}-${index}`}>{part}</span>
      })}
    </p>
  )
}

export function LinkPreview({ urls }: { urls: PostUrl[] }) {
  const previews = urls.filter((url) => url.title || url.description)

  if (previews.length === 0) {
    return null
  }

  return (
    <div className="mt-3 grid gap-2">
      {previews.map((url) => (
        <a
          className="relative z-20 grid overflow-hidden rounded-xl border bg-muted/25 transition-colors hover:bg-muted/50"
          href={url.expandedUrl ?? url.url}
          key={url.id}
          rel="noreferrer"
          target="_blank"
        >
          {url.imageUrl ? (
            <div className="relative aspect-[1.91/1] border-b bg-muted">
              <RemoteMediaImage alt="" sizes="(max-width: 768px) 100vw, 50vw" src={url.imageUrl} />
            </div>
          ) : null}
          <div className="p-3">
            {url.title ? <p className="line-clamp-1 font-medium">{url.title}</p> : null}
            {url.description ? (
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{url.description}</p>
            ) : null}
            <p className="mt-2 truncate text-xs text-muted-foreground">{url.displayUrl ?? url.expandedUrl}</p>
          </div>
        </a>
      ))}
    </div>
  )
}
