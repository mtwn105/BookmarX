import type { Context } from "hono"
import { getCookie } from "hono/cookie"

import { sessionCookie } from "../auth/cookies"
import { getSessionUser } from "../auth/session"

export async function requireUser(c: Context) {
  const token = getCookie(c, sessionCookie)

  if (!token) {
    return null
  }

  return getSessionUser(token)
}
