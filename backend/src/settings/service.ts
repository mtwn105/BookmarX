import { eq } from "drizzle-orm"

import { env } from "../config/env"
import { db } from "../db/client"
import { settings } from "../db/schema"

export async function getOrCreateSettings(userId: string) {
  const [existing] = await db.select().from(settings).where(eq(settings.userId, userId)).limit(1)

  if (existing) {
    return existing
  }

  const [created] = await db
    .insert(settings)
    .values({
      userId,
      aiProvider: env.AI_PROVIDER === "vercel" ? "vercel" : "custom",
      embeddingModel: env.EMBEDDING_MODEL,
      chatModel: env.CHAT_MODEL,
    })
    .returning()

  return created
}
