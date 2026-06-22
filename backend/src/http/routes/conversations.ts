import { and, desc, eq, asc, count, sql } from "drizzle-orm"
import { Hono } from "hono"

import { db } from "../../db/client"
import { conversationMessages, conversations } from "../../db/schema"
import { generateText } from "ai"
import { chatModel } from "../../ai/models"
import { requireUser } from "../require-user"

export const conversationRoutes = new Hono()

conversationRoutes.get("/conversations", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const rows = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      messageCount: count(conversationMessages.id).as("message_count"),
    })
    .from(conversations)
    .leftJoin(conversationMessages, eq(conversationMessages.conversationId, conversations.id))
    .where(eq(conversations.userId, user.id))
    .groupBy(conversations.id)
    .orderBy(desc(conversations.updatedAt))
    .limit(10)

  return c.json({ conversations: rows })
})

conversationRoutes.get("/conversations/:id", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, c.req.param("id")), eq(conversations.userId, user.id)))
    .limit(1)

  if (!conversation) {
    return c.json({ error: "Conversation not found" }, 404)
  }

  const messages = await db
    .select()
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversation.id))
    .orderBy(asc(conversationMessages.createdAt))

  return c.json({ conversation, messages })
})

conversationRoutes.post("/conversations", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const body = (await c.req.json()) as { title?: string }
  const existing = await db
    .select({ count: count() })
    .from(conversations)
    .where(eq(conversations.userId, user.id))

  if (Number(existing[0]?.count ?? 0) >= 10) {
    const oldest = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.userId, user.id))
      .orderBy(asc(conversations.updatedAt))
      .limit(1)

    if (oldest[0]) {
      await db.delete(conversations).where(eq(conversations.id, oldest[0].id))
    }
  }

  const [conversation] = await db
    .insert(conversations)
    .values({ userId: user.id, title: body?.title?.trim() ? body.title.slice(0, 120) : "New conversation" })
    .returning()

  return c.json({ conversation }, 201)
})

conversationRoutes.patch("/conversations/:id", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const body = (await c.req.json()) as { title?: string }
  const [conversation] = await db
    .update(conversations)
    .set({
      title: body.title?.trim()?.slice(0, 120) ?? undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(conversations.id, c.req.param("id")), eq(conversations.userId, user.id)))
    .returning()

  if (!conversation) {
    return c.json({ error: "Conversation not found" }, 404)
  }

  return c.json({ conversation })
})

conversationRoutes.delete("/conversations/:id", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const [deleted] = await db
    .delete(conversations)
    .where(and(eq(conversations.id, c.req.param("id")), eq(conversations.userId, user.id)))
    .returning({ id: conversations.id })

  if (!deleted) {
    return c.json({ error: "Conversation not found" }, 404)
  }

  return c.json({ ok: true })
})

conversationRoutes.post("/conversations/:id/messages", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, c.req.param("id")), eq(conversations.userId, user.id)))
    .limit(1)

  if (!conversation) {
    return c.json({ error: "Conversation not found" }, 404)
  }

  const body = (await c.req.json()) as {
    message: { role: "user" | "assistant"; content: string; sources?: Array<Record<string, unknown>> }
  }

  const [message] = await db
    .insert(conversationMessages)
    .values({
      conversationId: conversation.id,
      role: body.message.role,
      content: body.message.content,
      sources: body.message.sources ?? null,
    })
    .returning()

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversation.id))

  const isFirstMessage = await db
    .select({ count: count() })
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversation.id))

  if (Number(isFirstMessage[0]?.count ?? 0) === 1 && body.message.role === "user") {
    const trimmed = body.message.content.slice(0, 120)
    const autoTitle = trimmed.length < body.message.content.length ? `${trimmed}...` : trimmed

    await db
      .update(conversations)
      .set({ title: autoTitle, updatedAt: new Date() })
      .where(eq(conversations.id, conversation.id))
  }

  return c.json({ message }, 201)
})

conversationRoutes.post("/conversations/:id/generate-title", async (c) => {
  const user = await requireUser(c)

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, c.req.param("id")), eq(conversations.userId, user.id)))
    .limit(1)

  if (!conversation) {
    return c.json({ error: "Conversation not found" }, 404)
  }

  const messages = await db
    .select()
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversation.id))
    .orderBy(asc(conversationMessages.createdAt))
    .limit(4)

  if (messages.length === 0) {
    return c.json({ title: "New conversation" })
  }

  const context = messages.map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content.slice(0, 500)}`).join("\n")
  const result = await generateText({
    model: chatModel,
    system: "Generate a short title (under 8 words) for this conversation based on the first few messages. Return only the title, no quotes or punctuation.",
    prompt: context,
  })

  const aiTitle = result.text.trim().slice(0, 120)
  await db
    .update(conversations)
    .set({ title: aiTitle, updatedAt: new Date() })
    .where(eq(conversations.id, conversation.id))

  return c.json({ title: aiTitle })
})
