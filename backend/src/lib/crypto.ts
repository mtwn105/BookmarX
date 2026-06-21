import { createCipheriv, createHash, randomBytes } from "node:crypto"

import { env } from "../config/env"

const key = createHash("sha256").update(env.ENCRYPTION_KEY).digest()

export function encryptSecret(value: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".")
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}
