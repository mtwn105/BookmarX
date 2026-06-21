const bookmarksEndpoint = "https://api.x.com/2/users"

export type XBookmarkPost = {
  id: string
  text: string
  author_id?: string
  conversation_id?: string
  created_at?: string
  lang?: string
  public_metrics?: {
    retweet_count?: number
    reply_count?: number
    like_count?: number
    quote_count?: number
    bookmark_count?: number
    impression_count?: number
  }
  entities?: {
    urls?: Array<{
      url: string
      expanded_url?: string
      display_url?: string
      title?: string
      description?: string
    }>
  }
}

export type XBookmarkUser = {
  id: string
  username: string
  name: string
  profile_image_url?: string
}

export type XBookmarksPage = {
  data?: XBookmarkPost[]
  includes?: {
    users?: XBookmarkUser[]
  }
  meta?: {
    result_count?: number
    next_token?: string
  }
}

export async function fetchBookmarksPage(input: {
  accessToken: string
  xUserId: string
  paginationToken?: string | null
}): Promise<XBookmarksPage> {
  const url = new URL(`${bookmarksEndpoint}/${input.xUserId}/bookmarks`)

  url.searchParams.set("max_results", "100")
  url.searchParams.set("tweet.fields", "author_id,conversation_id,created_at,entities,lang,public_metrics")
  url.searchParams.set("expansions", "author_id")
  url.searchParams.set("user.fields", "profile_image_url,username,name")

  if (input.paginationToken) {
    url.searchParams.set("pagination_token", input.paginationToken)
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`X bookmarks fetch failed with status ${response.status}`)
  }

  return response.json() as Promise<XBookmarksPage>
}
