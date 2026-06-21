import { eq } from "drizzle-orm"
import { Hono } from "hono"

import { db } from "../../db/client"
import { settings } from "../../db/schema"
import { getOrCreateSettings } from "../../settings/service"
import { requireUser } from "../require-user"

export const settingsRoutes = new Hono()

settingsRoutes.get("/settings", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  return c.json({ settings: await getOrCreateSettings(user.id) })
})

settingsRoutes.patch("/settings", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  await getOrCreateSettings(user.id)

  const body = (await c.req.json()) as {
    scheduledSyncEnabled?: boolean
    dailyBriefEnabled?: boolean
    embeddingModel?: string
    chatModel?: string
  }
  const [updated] = await db
    .update(settings)
    .set({
      scheduledSyncEnabled: body.scheduledSyncEnabled,
      dailyBriefEnabled: body.dailyBriefEnabled,
      embeddingModel: body.embeddingModel?.trim() || undefined,
      chatModel: body.chatModel?.trim() || undefined,
      updatedAt: new Date(),
    })
    .where(eq(settings.userId, user.id))
    .returning()

  return c.json({ settings: updated })
})
