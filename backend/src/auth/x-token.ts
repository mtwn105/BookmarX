import { eq } from "drizzle-orm"

import { db } from "../db/client"
import { oauthTokens, xAccounts } from "../db/schema"
import { decryptSecret, encryptSecret } from "../lib/crypto"
import { refreshAccessToken } from "./x-oauth"

const refreshLeewayMs = 5 * 60 * 1000
const refreshesByAccount = new Map<string, Promise<XAuth>>()

export type XAuth = {
  xAccountId: string
  xUserId: string
  accessToken: string
}

export async function getValidXAuthForUser(userId: string, forceRefresh = false): Promise<XAuth> {
  const stored = await getStoredXAuth(userId)

  if (!forceRefresh && stored.expiresAt && stored.expiresAt.getTime() > Date.now() + refreshLeewayMs) {
    return {
      xAccountId: stored.xAccountId,
      xUserId: stored.xUserId,
      accessToken: decryptSecret(stored.accessTokenEncrypted),
    }
  }

  if (!stored.refreshTokenEncrypted) {
    if (!forceRefresh && (!stored.expiresAt || stored.expiresAt.getTime() > Date.now())) {
      return {
        xAccountId: stored.xAccountId,
        xUserId: stored.xUserId,
        accessToken: decryptSecret(stored.accessTokenEncrypted),
      }
    }
    throw new Error("X access token expired and no refresh token is available. Reconnect the X account.")
  }

  const existingRefresh = refreshesByAccount.get(stored.xAccountId)
  if (existingRefresh) {
    return existingRefresh
  }

  const refreshPromise = refreshAndPersist(stored)
  refreshesByAccount.set(stored.xAccountId, refreshPromise)

  try {
    return await refreshPromise
  } finally {
    refreshesByAccount.delete(stored.xAccountId)
  }
}

async function getStoredXAuth(userId: string) {
  const [stored] = await db
    .select({
      xAccountId: xAccounts.id,
      xUserId: xAccounts.xUserId,
      accessTokenEncrypted: oauthTokens.accessTokenEncrypted,
      refreshTokenEncrypted: oauthTokens.refreshTokenEncrypted,
      scope: oauthTokens.scope,
      expiresAt: oauthTokens.expiresAt,
    })
    .from(xAccounts)
    .innerJoin(oauthTokens, eq(oauthTokens.xAccountId, xAccounts.id))
    .where(eq(xAccounts.userId, userId))
    .limit(1)

  if (!stored) {
    throw new Error("No X account connected")
  }

  return stored
}

async function refreshAndPersist(stored: Awaited<ReturnType<typeof getStoredXAuth>>): Promise<XAuth> {
  if (!stored.refreshTokenEncrypted) {
    throw new Error("X refresh token is unavailable")
  }

  const token = await refreshAccessToken(decryptSecret(stored.refreshTokenEncrypted))
  const expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null

  await db
    .update(oauthTokens)
    .set({
      accessTokenEncrypted: encryptSecret(token.access_token),
      refreshTokenEncrypted: token.refresh_token
        ? encryptSecret(token.refresh_token)
        : stored.refreshTokenEncrypted,
      scope: token.scope ?? stored.scope,
      expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(oauthTokens.xAccountId, stored.xAccountId))

  return {
    xAccountId: stored.xAccountId,
    xUserId: stored.xUserId,
    accessToken: token.access_token,
  }
}
