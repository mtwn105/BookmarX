import { env } from "../config/env"

const authorizationEndpoint = "https://x.com/i/oauth2/authorize"
const tokenEndpoint = "https://api.x.com/2/oauth2/token"
const meEndpoint = "https://api.x.com/2/users/me?user.fields=profile_image_url"
const scopes = ["tweet.read", "users.read", "bookmark.read", "offline.access"]

export type XTokenResponse = {
  token_type: string
  expires_in?: number
  access_token: string
  refresh_token?: string
  scope?: string
}

export type XUserResponse = {
  data: {
    id: string
    name: string
    username: string
    profile_image_url?: string
  }
}

type XOAuthConfig = {
  X_CLIENT_ID: string
  X_CLIENT_SECRET: string
  X_REDIRECT_URI: string
}

export function getXOAuthConfig(): XOAuthConfig {
  if (!env.X_CLIENT_ID || !env.X_CLIENT_SECRET || !env.X_REDIRECT_URI) {
    throw new Error("X OAuth is not configured")
  }

  return {
    X_CLIENT_ID: env.X_CLIENT_ID,
    X_CLIENT_SECRET: env.X_CLIENT_SECRET,
    X_REDIRECT_URI: env.X_REDIRECT_URI,
  }
}

export async function createAuthorizationUrl() {
  const config = getXOAuthConfig()

  const state = crypto.randomUUID()
  const codeVerifier = crypto.randomUUID() + crypto.randomUUID()
  const codeChallenge = await createCodeChallenge(codeVerifier)
  const url = new URL(authorizationEndpoint)

  url.searchParams.set("response_type", "code")
  url.searchParams.set("client_id", config.X_CLIENT_ID)
  url.searchParams.set("redirect_uri", config.X_REDIRECT_URI)
  url.searchParams.set("scope", scopes.join(" "))
  url.searchParams.set("state", state)
  url.searchParams.set("code_challenge", codeChallenge)
  url.searchParams.set("code_challenge_method", "S256")

  return { url: url.toString(), state, codeVerifier }
}

export async function exchangeCodeForToken(code: string, codeVerifier: string): Promise<XTokenResponse> {
  const config = getXOAuthConfig()

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.X_REDIRECT_URI,
    code_verifier: codeVerifier,
  })

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.X_CLIENT_ID}:${config.X_CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  })

  if (!response.ok) {
    throw new Error(`X token exchange failed with status ${response.status}`)
  }

  return response.json() as Promise<XTokenResponse>
}

export async function refreshAccessToken(refreshToken: string): Promise<XTokenResponse> {
  const config = getXOAuthConfig()
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.X_CLIENT_ID,
  })
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.X_CLIENT_ID}:${config.X_CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`X token refresh failed with status ${response.status}: ${errorBody.slice(0, 300)}`)
  }

  return response.json() as Promise<XTokenResponse>
}

export async function fetchXMe(accessToken: string): Promise<XUserResponse> {
  const response = await fetch(meEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`X user lookup failed with status ${response.status}`)
  }

  return response.json() as Promise<XUserResponse>
}

async function createCodeChallenge(codeVerifier: string): Promise<string> {
  const data = new TextEncoder().encode(codeVerifier)
  const digest = await crypto.subtle.digest("SHA-256", data)

  return Buffer.from(digest).toString("base64url")
}
