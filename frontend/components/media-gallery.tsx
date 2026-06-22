"use client"

import { useState } from "react"
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ExpandIcon,
  VideoOffIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { RemoteMediaImage } from "@/components/remote-media-image"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type { PostMedia } from "@/lib/api"
import { cn } from "@/lib/utils"

export function MediaGallery({ media }: { media: PostMedia[] }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  if (media.length === 0) {
    return null
  }

  const active = media[Math.min(activeIndex, media.length - 1)]
  const showPrevious = () => setActiveIndex((index) => (index - 1 + media.length) % media.length)
  const showNext = () => setActiveIndex((index) => (index + 1) % media.length)

  return (
    <>
      <div className="relative z-30 mt-3 overflow-hidden rounded-xl border bg-black/5 dark:bg-black/30">
        <MediaFrame
          item={active}
          onOpenImage={active.type === "photo" ? () => setLightboxOpen(true) : undefined}
        />
        {media.length > 1 ? (
          <>
            <GalleryNavigation onNext={showNext} onPrevious={showPrevious} />
            <div className="flex gap-1.5 overflow-x-auto border-t bg-background/90 p-2">
              {media.map((item, index) => (
                <button
                  aria-label={`View media ${index + 1}`}
                  className={cn(
                    "relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-muted ring-offset-background transition",
                    index === activeIndex ? "ring-2 ring-primary ring-offset-2" : "opacity-65 hover:opacity-100",
                  )}
                  key={item.id}
                  onClick={() => setActiveIndex(index)}
                  type="button"
                >
                  <MediaThumbnail item={item} />
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <Dialog onOpenChange={setLightboxOpen} open={lightboxOpen}>
        <DialogContent
          className="flex h-[min(92svh,60rem)] max-w-[min(96vw,90rem)] flex-col gap-0 overflow-hidden rounded-2xl bg-black p-3 text-white sm:max-w-[min(96vw,90rem)]"
          showCloseButton
        >
          <DialogTitle className="sr-only">Post image viewer</DialogTitle>
          <DialogDescription className="sr-only">
            View the original post image and browse attached media.
          </DialogDescription>
          <div className="relative min-h-0 flex-1">
            <MediaFrame item={active} lightbox />
            {media.length > 1 ? <GalleryNavigation onNext={showNext} onPrevious={showPrevious} /> : null}
            <div className="absolute bottom-3 left-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-white -translate-x-1/2">
              {activeIndex + 1} / {media.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function MediaFrame({
  item,
  lightbox = false,
  onOpenImage,
}: {
  item: PostMedia
  lightbox?: boolean
  onOpenImage?: () => void
}) {
  const width = item.rawJson?.width ?? 16
  const height = item.rawJson?.height ?? 9
  const aspectRatio = `${width} / ${height}`

  if (item.type === "video" || item.type === "animated_gif") {
    return <PlayableVideo item={item} key={item.id} lightbox={lightbox} />
  }

  const src = item.url ?? item.previewImageUrl
  if (!src) {
    return null
  }

  return (
    <button
      aria-label="View image full size"
      className={cn(
        "group relative mx-auto block w-full cursor-zoom-in overflow-hidden bg-black/5",
        lightbox ? "h-full" : "max-h-[36rem]",
      )}
      onClick={onOpenImage}
      style={lightbox ? undefined : { aspectRatio }}
      type="button"
    >
      <RemoteMediaImage
        alt={item.rawJson?.alt_text ?? "Post media"}
        eager={lightbox}
        fit="contain"
        sizes={lightbox ? "96vw" : "(max-width: 768px) 100vw, 50vw"}
        src={src}
      />
      {!lightbox ? (
        <span className="absolute right-2 top-2 rounded-full bg-black/65 p-2 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <HugeiconsIcon icon={ExpandIcon} size={16} />
        </span>
      ) : null}
    </button>
  )
}

function PlayableVideo({ item, lightbox }: { item: PostMedia; lightbox: boolean }) {
  const sources = getVideoSources(item)
  const [sourceIndex, setSourceIndex] = useState(0)
  const source = sources[sourceIndex]
  const width = item.rawJson?.width ?? 16
  const height = item.rawJson?.height ?? 9

  if (!source) {
    return (
      <div className="flex aspect-video items-center justify-center gap-2 text-sm text-muted-foreground">
        <HugeiconsIcon icon={VideoOffIcon} />
        Video unavailable
      </div>
    )
  }

  return (
    <video
      className={cn("relative z-40 mx-auto block w-full bg-black object-contain", lightbox ? "h-full" : "max-h-[36rem]")}
      controls
      key={source}
      loop={item.type === "animated_gif"}
      muted={item.type === "animated_gif"}
      onError={() => {
        if (sourceIndex < sources.length - 1) {
          setSourceIndex((index) => index + 1)
        }
      }}
      playsInline
      poster={item.previewImageUrl ?? undefined}
      preload="metadata"
      src={source}
      style={lightbox ? undefined : { aspectRatio: `${width} / ${height}` }}
    />
  )
}

function MediaThumbnail({ item }: { item: PostMedia }) {
  const src = item.type === "photo" ? item.url ?? item.previewImageUrl : item.previewImageUrl

  if (!src) {
    return (
      <span className="flex size-full items-center justify-center">
        <HugeiconsIcon icon={VideoOffIcon} size={16} />
      </span>
    )
  }

  return <RemoteMediaImage alt="" fit="cover" sizes="64px" src={src} />
}

function GalleryNavigation({
  onPrevious,
  onNext,
}: {
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <>
      <Button
        aria-label="Previous media"
        className="absolute left-2 top-1/2 z-50 -translate-y-1/2 bg-black/65 text-white hover:bg-black/80"
        onClick={onPrevious}
        size="icon"
        type="button"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} />
      </Button>
      <Button
        aria-label="Next media"
        className="absolute right-2 top-1/2 z-50 -translate-y-1/2 bg-black/65 text-white hover:bg-black/80"
        onClick={onNext}
        size="icon"
        type="button"
      >
        <HugeiconsIcon icon={ArrowRight01Icon} />
      </Button>
    </>
  )
}

function getVideoSources(media: PostMedia) {
  return (
    media.rawJson?.variants
      ?.filter((variant) => variant.content_type === "video/mp4")
      .sort((a, b) => (b.bit_rate ?? 0) - (a.bit_rate ?? 0))
      .map((variant) => `/api/media/video?url=${encodeURIComponent(variant.url)}`) ?? []
  )
}
