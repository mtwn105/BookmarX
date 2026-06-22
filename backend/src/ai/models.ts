import { createOpenAI } from "@ai-sdk/openai"

import { env } from "../config/env"

export const openai = createOpenAI({
  apiKey: env.AI_API_KEY,
})

export const embeddingModel = openai.embedding(env.EMBEDDING_MODEL.replace("openai/", ""))
export const chatModel = openai(env.CHAT_MODEL.replace("openai/", ""))
export const embeddingModelId = env.EMBEDDING_MODEL
export const chatModelId = env.CHAT_MODEL
