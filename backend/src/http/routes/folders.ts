import { and, asc, eq } from "drizzle-orm"
import { Hono } from "hono"

import { db } from "../../db/client"
import { folders } from "../../db/schema"
import { requireUser } from "../require-user"

export const folderRoutes = new Hono()

folderRoutes.get("/folders", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const rows = await db.select().from(folders).where(eq(folders.userId, user.id)).orderBy(asc(folders.sortOrder), asc(folders.name))

  return c.json({ folders: rows })
})

folderRoutes.post("/folders", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const body = (await c.req.json()) as { name?: string; parentId?: string | null; color?: string | null }

  if (!body.name?.trim()) {
    return c.json({ error: "Folder name is required" }, 400)
  }

  const [folder] = await db
    .insert(folders)
    .values({ userId: user.id, name: body.name.trim(), parentId: body.parentId, color: body.color })
    .returning()

  return c.json({ folder }, 201)
})

folderRoutes.patch("/folders/:id", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const body = (await c.req.json()) as { name?: string; parentId?: string | null; color?: string | null }
  const [folder] = await db
    .update(folders)
    .set({ name: body.name?.trim(), parentId: body.parentId, color: body.color, updatedAt: new Date() })
    .where(and(eq(folders.id, c.req.param("id")), eq(folders.userId, user.id)))
    .returning()

  if (!folder) {
    return c.json({ error: "Folder not found" }, 404)
  }

  return c.json({ folder })
})

folderRoutes.delete("/folders/:id", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  await db.delete(folders).where(and(eq(folders.id, c.req.param("id")), eq(folders.userId, user.id)))

  return c.json({ ok: true })
})
