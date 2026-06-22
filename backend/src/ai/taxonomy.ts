import { and, eq } from "drizzle-orm"

import { db } from "../db/client"
import { folders } from "../db/schema"

export const standardFolders = [
  { name: "AI & Machine Learning", color: "#7c3aed" },
  { name: "Software Engineering", color: "#2563eb" },
  { name: "Product & Startups", color: "#0891b2" },
  { name: "Design & UX", color: "#db2777" },
  { name: "Business & Strategy", color: "#4f46e5" },
  { name: "Marketing & Growth", color: "#ea580c" },
  { name: "Finance & Investing", color: "#059669" },
  { name: "Research & Learning", color: "#0d9488" },
  { name: "News & Trends", color: "#dc2626" },
  { name: "Career & Productivity", color: "#ca8a04" },
  { name: "Tools & Resources", color: "#0284c7" },
  { name: "Writing & Content", color: "#9333ea" },
  { name: "Health & Lifestyle", color: "#16a34a" },
  { name: "Culture & Entertainment", color: "#e11d48" },
  { name: "Inspiration & Ideas", color: "#d97706" },
  { name: "Miscellaneous", color: "#64748b" },
] as const

export type StandardFolderName = (typeof standardFolders)[number]["name"]

export async function ensureStandardFolders(userId: string) {
  const existing = await db.select().from(folders).where(eq(folders.userId, userId))
  const existingNames = new Set(existing.map((folder) => folder.name))

  for (const [sortOrder, folder] of standardFolders.entries()) {
    if (existingNames.has(folder.name)) {
      continue
    }

    await db
      .insert(folders)
      .values({ userId, name: folder.name, color: folder.color, sortOrder })
  }

  return db.select().from(folders).where(and(eq(folders.userId, userId)))
}

export function isStandardFolderName(value: string): value is StandardFolderName {
  return standardFolders.some((folder) => folder.name === value)
}
