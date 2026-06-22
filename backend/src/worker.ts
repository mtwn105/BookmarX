import { Worker } from "bullmq"

import { env } from "./config/env"
import { runEmbedBookmarkJob } from "./jobs/embed-bookmark"
import { enrichBookmark } from "./jobs/enrich-bookmark"
import { cleanupOldJobs, enqueueScheduledSyncs, generateScheduledBriefs } from "./jobs/scheduled-sync"
import { syncBookmarks } from "./jobs/sync-bookmarks"
import type { AiJobData } from "./queues/ai"
import { redisConnection } from "./queues/connection"
import type { SyncBookmarksJobData } from "./queues/sync"

console.log(`BookmarX worker started in ${env.NODE_ENV} mode`)

const scheduler = setInterval(() => {
  void enqueueScheduledSyncs().catch((error) => {
    console.error("Scheduled sync scan failed", error)
  })
  void cleanupOldJobs().catch((error) => {
    console.error("Job cleanup failed", error)
  })
  void generateScheduledBriefs().catch((error) => {
    console.error("Scheduled brief generation failed", error)
  })
}, 60 * 60 * 1000)

void enqueueScheduledSyncs().catch((error) => {
  console.error("Initial scheduled sync scan failed", error)
})
void generateScheduledBriefs().catch((error) => {
  console.error("Initial scheduled brief generation failed", error)
})

const syncWorker = new Worker<SyncBookmarksJobData>(
  "sync",
  async (job) => {
    if (job.name !== "x.syncBookmarks") {
      throw new Error(`Unknown sync job: ${job.name}`)
    }

    await syncBookmarks(job.data)
  },
  { connection: redisConnection },
)

const aiWorker = new Worker<AiJobData>(
  "ai",
  async (job) => {
    if (job.name === "bookmark.embed") {
      await runEmbedBookmarkJob(job.data)
      return
    }

    if (job.name === "bookmark.enrich" && job.data.userId) {
      await enrichBookmark({ bookmarkId: job.data.bookmarkId, userId: job.data.userId })
      return
    }

    throw new Error(`Unknown AI job: ${job.name}`)
  },
  { connection: redisConnection },
)

syncWorker.on("completed", (job) => {
  console.log(`Sync job ${job.id} completed`)
})

syncWorker.on("failed", (job, error) => {
  console.error(`Sync job ${job?.id ?? "unknown"} failed`, error)
})

aiWorker.on("completed", (job) => {
  console.log(`AI job ${job.id} completed`)
})

aiWorker.on("failed", (job, error) => {
  console.error(`AI job ${job?.id ?? "unknown"} failed`, error)
})

let isShuttingDown = false

process.on("SIGINT", () => {
  void shutdown()
})

process.on("SIGTERM", () => {
  void shutdown()
})

async function shutdown() {
  if (isShuttingDown) {
    return
  }

  isShuttingDown = true
  console.log("BookmarX worker stopping")
  clearInterval(scheduler)
  await syncWorker.close()
  await aiWorker.close()
  process.exit(0)
}
