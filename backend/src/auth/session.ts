import { eq } from "drizzle-orm"

import { db } from "../db/client"
import { sessions, users } from "../db/schema"
import { sha256 } from "../lib/crypto"

const SESSION_TTL_DAYS = 30

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomUUID() + crypto.randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)

  await db.insert(sessions).values({
    userId,
    tokenHash: sha256(token),
    expiresAt,
  })

  return { token, expiresAt }
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)))
}

export async function getSessionUser(token: string) {
  const [sessionUser] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      imageUrl: users.imageUrl,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, sha256(token)))
    .limit(1)

  if (!sessionUser || sessionUser.expiresAt <= new Date()) {
    return null
  }

  return {
    id: sessionUser.id,
    name: sessionUser.name,
    email: sessionUser.email,
    imageUrl: sessionUser.imageUrl,
  }
}
