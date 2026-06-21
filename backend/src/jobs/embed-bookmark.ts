import { embedBookmark } from "../ai/embeddings"

export async function runEmbedBookmarkJob(input: { bookmarkId: string }) {
  await embedBookmark(input.bookmarkId)
}
