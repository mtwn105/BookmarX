import { Hono } from "hono"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"
import { eq } from "drizzle-orm"

import { env } from "../../config/env"
import { db } from "../../db/client"
import { oauthTokens, users, xAccounts } from "../../db/schema"
import { createSession, deleteSession, getSessionUser } from "../../auth/session"
import { sessionCookie, xStateCookie, xVerifierCookie } from "../../auth/cookies"
import { createAuthorizationUrl, exchangeCodeForToken, fetchXMe } from "../../auth/x-oauth"
import { encryptSecret } from "../../lib/crypto"

export const authRoutes = new Hono()

authRoutes.get("/auth/x/start", async (c) => {
  const { url, state, codeVerifier } = await createAuthorizationUrl()

  setCookie(c, xStateCookie, state, oauthCookieOptions())
  setCookie(c, xVerifierCookie, codeVerifier, oauthCookieOptions())

  return c.redirect(url)
})

authRoutes.get("/auth/x/callback", async (c) => {
  const code = c.req.query("code")
  const state = c.req.query("state")
  const expectedState = getCookie(c, xStateCookie)
  const codeVerifier = getCookie(c, xVerifierCookie)

  deleteCookie(c, xStateCookie, cookieBaseOptions())
  deleteCookie(c, xVerifierCookie, cookieBaseOptions())

  if (!code || !state || !expectedState || !codeVerifier || state !== expectedState) {
    return c.json({ error: "Invalid X OAuth callback" }, 400)
  }

  const token = await exchangeCodeForToken(code, codeVerifier)
  const xMe = await fetchXMe(token.access_token)
  const userId = await upsertUserFromXAccount(xMe.data, token)
  const session = await createSession(userId)

  setCookie(c, sessionCookie, session.token, {
    ...cookieBaseOptions(),
    maxAge: Math.floor((session.expiresAt.getTime() - Date.now()) / 1000),
  })

  return c.redirect(`${env.FRONTEND_URL}/app`)
})

authRoutes.post("/auth/logout", async (c) => {
  const token = getCookie(c, sessionCookie)

  if (token) {
    await deleteSession(token)
  }

  deleteCookie(c, sessionCookie, cookieBaseOptions())
  return c.json({ ok: true })
})

authRoutes.get("/me", async (c) => {
  const token = getCookie(c, sessionCookie)

  if (!token) {
    return c.json({ user: null }, 401)
  }

  const user = await getSessionUser(token)

  if (!user) {
    deleteCookie(c, sessionCookie, cookieBaseOptions())
    return c.json({ user: null }, 401)
  }

  const [account] = await db
    .select({ username: xAccounts.username })
    .from(xAccounts)
    .where(eq(xAccounts.userId, user.id))
    .limit(1)

  return c.json({ user: { ...user, username: account?.username ?? null } })
})

async function upsertUserFromXAccount(
  xUser: { id: string; name: string; username: string; profile_image_url?: string },
  token: { access_token: string; refresh_token?: string; scope?: string; expires_in?: number },
): Promise<string> {
  const [existingAccount] = await db.select().from(xAccounts).where(eq(xAccounts.xUserId, xUser.id)).limit(1)
  const expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null

  if (existingAccount) {
    await db
      .update(users)
      .set({ name: xUser.name, imageUrl: xUser.profile_image_url ?? null, updatedAt: new Date() })
      .where(eq(users.id, existingAccount.userId))

    await db
      .update(xAccounts)
      .set({
        username: xUser.username,
        displayName: xUser.name,
        avatarUrl: xUser.profile_image_url ?? null,
        updatedAt: new Date(),
      })
      .where(eq(xAccounts.id, existingAccount.id))

    await db
      .insert(oauthTokens)
      .values({
        xAccountId: existingAccount.id,
        accessTokenEncrypted: encryptSecret(token.access_token),
        refreshTokenEncrypted: token.refresh_token ? encryptSecret(token.refresh_token) : null,
        scope: token.scope,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: oauthTokens.xAccountId,
        set: {
          accessTokenEncrypted: encryptSecret(token.access_token),
          refreshTokenEncrypted: token.refresh_token ? encryptSecret(token.refresh_token) : null,
          scope: token.scope,
          expiresAt,
          updatedAt: new Date(),
        },
      })

    return existingAccount.userId
  }

  const [user] = await db
    .insert(users)
    .values({ name: xUser.name, imageUrl: xUser.profile_image_url ?? null })
    .returning({ id: users.id })

  const [xAccount] = await db
    .insert(xAccounts)
    .values({
      userId: user.id,
      xUserId: xUser.id,
      username: xUser.username,
      displayName: xUser.name,
      avatarUrl: xUser.profile_image_url ?? null,
    })
    .returning({ id: xAccounts.id })

  await db.insert(oauthTokens).values({
    xAccountId: xAccount.id,
    accessTokenEncrypted: encryptSecret(token.access_token),
    refreshTokenEncrypted: token.refresh_token ? encryptSecret(token.refresh_token) : null,
    scope: token.scope,
    expiresAt,
  })

  return user.id
}

function oauthCookieOptions() {
  return {
    ...cookieBaseOptions(),
    maxAge: 10 * 60,
  }
}

function cookieBaseOptions() {
  return {
    httpOnly: true,
    sameSite: "Lax" as const,
    secure: env.NODE_ENV === "production",
    path: "/",
  }
}
