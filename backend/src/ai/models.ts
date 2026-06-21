import { env } from "../config/env"

if (env.AI_API_KEY && !process.env.AI_GATEWAY_API_KEY) {
  process.env.AI_GATEWAY_API_KEY = env.AI_API_KEY
}

export const embeddingModel = env.EMBEDDING_MODEL
export const chatModel = env.CHAT_MODEL
