"use client"

import { useEffect, useState } from "react"
import { RefreshIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import type { SyncStatus } from "@/lib/api"

export function SyncProgress({ initialStatus }: { initialStatus: SyncStatus }) {
  const [status, setStatus] = useState(initialStatus)
  const [now, setNow] = useState<number | null>(null)
  const active = status.job?.status === "queued" || status.job?.status === "running"

  useEffect(() => {
    if (!active) {
      return
    }
    const clock = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(clock)
  }, [active])

  useEffect(() => {
    if (!active && status.library.pending === 0) {
      return
    }

    const refresh = async () => {
      const response = await fetch("/api/sync/status", { cache: "no-store" })
      if (response.ok) {
        setStatus((await response.json()) as SyncStatus)
      }
    }
    const interval = window.setInterval(() => void refresh(), 2_500)
    return () => window.clearInterval(interval)
  }, [active, status.library.pending])

  if (!status.job && status.library.total === 0) {
    return null
  }

  if (status.job?.status === "failed") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Sync failed after fetching {status.job.resourcesFetched.toLocaleString()} resources</AlertTitle>
        <AlertDescription>{status.job.errorMessage ?? "The X sync stopped unexpectedly."}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="overflow-hidden border-info/25 bg-white" size="sm">
      {active ? <div className="h-0.5 w-1/3 animate-[sync-slide_1.4s_ease-in-out_infinite] bg-info" /> : null}
      <CardContent className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-info/15 text-[#087da9]">
            <HugeiconsIcon className={active ? "animate-spin" : ""} icon={RefreshIcon} size={17} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">
              {active
                ? `Syncing X bookmarks · page ${Math.max(1, Math.ceil(status.job!.resourcesFetched / 50))}`
                : "Library sync complete"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {status.job?.resourcesFetched.toLocaleString() ?? 0} X resources fetched ·{" "}
              {status.library.total.toLocaleString()} unique bookmarks in Library
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5 text-right text-sm tabular-nums">
          <div>
            <p className="font-semibold text-ai">{status.library.enriched.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">AI organized</p>
          </div>
          <div>
            <p className="font-medium">{status.library.pending.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>
        {active && status.job?.startedAt ? (
          <p className="text-xs text-muted-foreground sm:col-span-2">
            {now ? `Running for ${formatElapsed(status.job.startedAt, now)}. ` : ""}
            X does not provide the total bookmark count, so progress remains open-ended until pagination finishes.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function formatElapsed(startedAt: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1_000))
  const minutes = Math.floor(seconds / 60)
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`
}
