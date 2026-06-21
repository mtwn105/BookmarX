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
