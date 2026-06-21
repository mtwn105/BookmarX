import { sql } from "drizzle-orm"
import { Hono } from "hono"

import { env } from "../../config/env"
import { db } from "../../db/client"

export const setupRoutes = new Hono()

setupRoutes.get("/setup/status", async (c) => {
  const database = await checkDatabase()

  return c.json({
    database,
    config: {
      xOAuth: Boolean(env.X_CLIENT_ID && env.X_CLIENT_SECRET && env.X_REDIRECT_URI),
      ai: Boolean(env.AI_API_KEY),
      encryptionKey: env.ENCRYPTION_KEY.length > 0,
      frontendUrl: env.FRONTEND_URL,
      embeddingModel: env.EMBEDDING_MODEL,
      chatModel: env.CHAT_MODEL,
    },
  })
})

async function checkDatabase() {
  try {
    await db.execute(sql`select 1`)

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown database error",
    }
  }
}
