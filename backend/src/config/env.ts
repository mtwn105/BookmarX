import { z } from "zod"

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  ENCRYPTION_KEY: z.string().min(1),
  X_CLIENT_ID: z.string().optional(),
  X_CLIENT_SECRET: z.string().optional(),
  X_REDIRECT_URI: z.string().url().optional(),
  AI_PROVIDER: z.string().default("vercel"),
  AI_API_KEY: z.string().optional(),
  EMBEDDING_MODEL: z.string().default("openai/text-embedding-3-small"),
  CHAT_MODEL: z.string().default("openai/gpt-4o-mini"),
})

export const env = envSchema.parse(process.env)
