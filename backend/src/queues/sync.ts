import { Queue } from "bullmq"

import { redisConnection } from "./connection"

export type SyncBookmarksJobData = {
  syncJobId: string
  userId: string
}

export const syncQueue = new Queue<SyncBookmarksJobData, void, "x.syncBookmarks">("sync", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5_000,
    },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
})
