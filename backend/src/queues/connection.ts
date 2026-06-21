import type { ConnectionOptions } from "bullmq"

import { env } from "../config/env"

const redisUrl = new URL(env.REDIS_URL)

export const redisConnection: ConnectionOptions = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
  db: Number(redisUrl.pathname.replace("/", "") || 0),
  maxRetriesPerRequest: null,
}
