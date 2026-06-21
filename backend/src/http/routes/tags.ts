import { and, asc, eq } from "drizzle-orm"
import { Hono } from "hono"

import { db } from "../../db/client"
import { tags } from "../../db/schema"
import { requireUser } from "../require-user"

export const tagRoutes = new Hono()

tagRoutes.get("/tags", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const rows = await db.select().from(tags).where(eq(tags.userId, user.id)).orderBy(asc(tags.name))

  return c.json({ tags: rows })
})

tagRoutes.post("/tags", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const body = (await c.req.json()) as { name?: string; color?: string | null }

  if (!body.name?.trim()) {
    return c.json({ error: "Tag name is required" }, 400)
  }

  const [tag] = await db.insert(tags).values({ userId: user.id, name: body.name.trim(), color: body.color }).returning()

  return c.json({ tag }, 201)
})

tagRoutes.patch("/tags/:id", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const body = (await c.req.json()) as { name?: string; color?: string | null }
  const [tag] = await db
    .update(tags)
    .set({ name: body.name?.trim(), color: body.color, updatedAt: new Date() })
    .where(and(eq(tags.id, c.req.param("id")), eq(tags.userId, user.id)))
    .returning()

  if (!tag) {
    return c.json({ error: "Tag not found" }, 404)
  }

  return c.json({ tag })
})

tagRoutes.delete("/tags/:id", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  await db.delete(tags).where(and(eq(tags.id, c.req.param("id")), eq(tags.userId, user.id)))

  return c.json({ ok: true })
})
