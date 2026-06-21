"use server"

import { revalidatePath } from "next/cache"

import { apiFetch } from "@/lib/api"

export async function startSync() {
  await apiFetch("/sync/x", { method: "POST" })
  revalidatePath("/app")
}

export async function createFolder(formData: FormData) {
  const name = String(formData.get("name") ?? "")
  const color = String(formData.get("color") ?? "")

  await apiFetch("/folders", {
    method: "POST",
    body: JSON.stringify({ name, color: color || null }),
  })
  revalidatePath("/app/folders")
}

export async function createTag(formData: FormData) {
  const name = String(formData.get("name") ?? "")
  const color = String(formData.get("color") ?? "")

  await apiFetch("/tags", {
    method: "POST",
    body: JSON.stringify({ name, color: color || null }),
  })
  revalidatePath("/app/tags")
}

export async function updateBookmarkNote(formData: FormData) {
  const id = String(formData.get("id") ?? "")
  const note = String(formData.get("note") ?? "")

  await apiFetch(`/bookmarks/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ note: note || null }),
  })
  revalidatePath(`/app/bookmarks/${id}`)
}

export async function archiveBookmark(formData: FormData) {
  const id = String(formData.get("id") ?? "")

  await apiFetch(`/bookmarks/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "archived" }),
  })
  revalidatePath("/app")
  revalidatePath(`/app/bookmarks/${id}`)
}

export async function generateDailyBrief() {
  await apiFetch("/briefs/generate", { method: "POST" })
  revalidatePath("/app/briefs")
}

export async function updateSettings(formData: FormData) {
  await apiFetch("/settings", {
    method: "PATCH",
    body: JSON.stringify({
      scheduledSyncEnabled: formData.get("scheduledSyncEnabled") === "on",
      dailyBriefEnabled: formData.get("dailyBriefEnabled") === "on",
      embeddingModel: String(formData.get("embeddingModel") ?? ""),
      chatModel: String(formData.get("chatModel") ?? ""),
    }),
  })
  revalidatePath("/app/settings")
}

export async function summarizeBookmark(formData: FormData) {
  const id = String(formData.get("id") ?? "")

  await apiFetch(`/ai/summarize/${id}`, { method: "POST" })
  revalidatePath(`/app/bookmarks/${id}`)
}

export async function suggestBookmarkTags(formData: FormData) {
  const id = String(formData.get("id") ?? "")

  await apiFetch(`/ai/suggest-tags/${id}`, { method: "POST" })
  revalidatePath(`/app/bookmarks/${id}`)
  revalidatePath("/app/tags")
}

export async function addBookmarkFolder(formData: FormData) {
  const bookmarkId = String(formData.get("bookmarkId") ?? "")
  const folderId = String(formData.get("folderId") ?? "")

  if (!folderId) {
    return
  }

  await apiFetch(`/bookmarks/${bookmarkId}/folders/${folderId}`, { method: "POST" })
  revalidatePath(`/app/bookmarks/${bookmarkId}`)
}

export async function addBookmarkTag(formData: FormData) {
  const bookmarkId = String(formData.get("bookmarkId") ?? "")
  const tagId = String(formData.get("tagId") ?? "")

  if (!tagId) {
    return
  }

  await apiFetch(`/bookmarks/${bookmarkId}/tags/${tagId}`, { method: "POST" })
  revalidatePath(`/app/bookmarks/${bookmarkId}`)
}
