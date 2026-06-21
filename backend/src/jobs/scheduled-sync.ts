import { and, desc, eq, gte, lt, or, sql } from "drizzle-orm"

import { generateDailyBriefForUser } from "../briefs/service"
import { db } from "../db/client"
import { briefs, settings, syncJobs, xAccounts } from "../db/schema"
import { syncQueue } from "../queues/sync"

const syncIntervalMs = 24 * 60 * 60 * 1000

export async function enqueueScheduledSyncs() {
  const cutoff = new Date(Date.now() - syncIntervalMs)
  const enabledUsers = await db
    .select({ userId: settings.userId })
    .from(settings)
    .innerJoin(xAccounts, eq(settings.userId, xAccounts.userId))
    .where(eq(settings.scheduledSyncEnabled, true))

  for (const { userId } of enabledUsers) {
    const [latestJob] = await db
      .select({ createdAt: syncJobs.createdAt, status: syncJobs.status })
      .from(syncJobs)
      .where(eq(syncJobs.userId, userId))
      .orderBy(desc(syncJobs.createdAt))
      .limit(1)

    if (latestJob && latestJob.createdAt > cutoff) {
      continue
    }

    const [runningJob] = await db
      .select({ id: syncJobs.id })
      .from(syncJobs)
      .where(and(eq(syncJobs.userId, userId), or(eq(syncJobs.status, "queued"), eq(syncJobs.status, "running"))))
      .limit(1)

    if (runningJob) {
      continue
    }

    const [syncJob] = await db.insert(syncJobs).values({ userId }).returning({ id: syncJobs.id })

    await syncQueue.add("x.syncBookmarks", { syncJobId: syncJob.id, userId })
  }
}

export async function cleanupOldJobs() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  await db
    .delete(syncJobs)
    .where(and(lt(syncJobs.createdAt, cutoff), sql`${syncJobs.status} in ('completed', 'failed', 'cancelled')`))
}

export async function generateScheduledBriefs() {
  const startOfDay = new Date()

  startOfDay.setHours(0, 0, 0, 0)

  const enabledUsers = await db
    .select({ userId: settings.userId })
    .from(settings)
    .where(eq(settings.dailyBriefEnabled, true))

  for (const { userId } of enabledUsers) {
    const [existingBrief] = await db
      .select({ id: briefs.id })
      .from(briefs)
      .where(and(eq(briefs.userId, userId), gte(briefs.generatedFor, startOfDay)))
      .limit(1)

    if (existingBrief) {
      continue
    }

    await generateDailyBriefForUser(userId)
  }
}
