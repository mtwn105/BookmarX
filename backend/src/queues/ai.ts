import { Queue } from "bullmq"

import { redisConnection } from "./connection"

export type AiJobData =
  | {
      bookmarkId: string
      userId?: string
    }

export type AiJobName = "bookmark.embed" | "bookmark.enrich"

export const aiQueue = new Queue<AiJobData, void, AiJobName>("ai", {
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
