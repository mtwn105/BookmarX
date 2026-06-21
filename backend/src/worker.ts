import { Worker } from "bullmq"

import { env } from "./config/env"
import { syncBookmarks } from "./jobs/sync-bookmarks"
import { redisConnection } from "./queues/connection"
import type { SyncBookmarksJobData } from "./queues/sync"

console.log(`BookmarX worker started in ${env.NODE_ENV} mode`)

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

syncWorker.on("failed", (job, error) => {
  console.error(`Sync job ${job?.id ?? "unknown"} failed`, error)
})

process.on("SIGINT", () => {
  void shutdown()
})

process.on("SIGTERM", () => {
  void shutdown()
})

async function shutdown() {
  console.log("BookmarX worker stopping")
  await syncWorker.close()
  process.exit(0)
}
