"use client"

import { useState } from "react"
import Image from "next/image"
import { ImageNotFound01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

export function RemoteMediaImage({
  src,
  alt,
  sizes,
  fit = "cover",
  eager = false,
}: {
  src: string
  alt: string
  sizes: string
  fit?: "cover" | "contain"
  eager?: boolean
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="flex size-full items-center justify-center bg-muted text-muted-foreground">
        <HugeiconsIcon icon={ImageNotFound01Icon} size={24} />
        <span className="sr-only">Image unavailable</span>
      </div>
    )
  }

  return (
    <Image
      alt={alt}
      className={fit === "contain" ? "object-contain" : "object-cover"}
      fill
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailed(true)}
      sizes={sizes}
      src={src}
      unoptimized
    />
  )
}
