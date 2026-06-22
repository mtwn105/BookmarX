const bookmarksEndpoint = "https://api.x.com/2/users"

export class XApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = "XApiError"
  }
}

export class XThreadSearchUnavailableError extends Error {
  constructor() {
    super("X thread search is unavailable for this API access level")
    this.name = "XThreadSearchUnavailableError"
  }
}

export type XBookmarkPost = {
  id: string
  text: string
  author_id?: string
  conversation_id?: string
  created_at?: string
  in_reply_to_user_id?: string
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
    hashtags?: Array<{ start: number; end: number; tag: string }>
    mentions?: Array<{ start: number; end: number; username: string; id?: string }>
    cashtags?: Array<{ start: number; end: number; tag: string }>
    urls?: Array<{
      start?: number
      end?: number
      url: string
      expanded_url?: string
      display_url?: string
      title?: string
      description?: string
      images?: Array<{ url: string; width: number; height: number }>
    }>
  }
  attachments?: {
    media_keys?: string[]
  }
  referenced_tweets?: Array<{
    type: "retweeted" | "quoted" | "replied_to"
    id: string
  }>
  note_tweet?: {
    text?: string
    entities?: XPostEntities
  }
}

export type XPostEntities = NonNullable<XBookmarkPost["entities"]>

export type XBookmarkUser = {
  id: string
  username: string
  name: string
  profile_image_url?: string
}

export type XBookmarkMedia = {
  media_key: string
  type: "photo" | "video" | "animated_gif"
  url?: string
  preview_image_url?: string
  width?: number
  height?: number
  alt_text?: string
  duration_ms?: number
  variants?: Array<{
    bit_rate?: number
    content_type: string
    url: string
  }>
}

export type XBookmarksPage = {
  data?: XBookmarkPost[]
  includes?: {
    users?: XBookmarkUser[]
    tweets?: XBookmarkPost[]
    media?: XBookmarkMedia[]
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

  // X currently drops `next_token` for this endpoint when max_results=100
  // even when more bookmarks exist. A 50-item page reliably returns cursors.
  url.searchParams.set("max_results", "50")
  url.searchParams.set(
    "tweet.fields",
    "attachments,author_id,conversation_id,created_at,entities,in_reply_to_user_id,lang,note_tweet,public_metrics,referenced_tweets",
  )
  url.searchParams.set(
    "expansions",
    "author_id,attachments.media_keys,referenced_tweets.id,referenced_tweets.id.author_id,referenced_tweets.id.attachments.media_keys",
  )
  url.searchParams.set("user.fields", "profile_image_url,username,name")
  url.searchParams.set(
    "media.fields",
    "alt_text,duration_ms,height,media_key,preview_image_url,type,url,variants,width",
  )

  if (input.paginationToken) {
    url.searchParams.set("pagination_token", input.paginationToken)
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
  })

  if (!response.ok) {
    throw new XApiError(`X bookmarks fetch failed with status ${response.status}`, response.status)
  }

  return response.json() as Promise<XBookmarksPage>
}

export async function fetchAuthorThread(input: {
  accessToken: string
  conversationId: string
  username: string
}): Promise<XBookmarksPage> {
  const query = `conversation_id:${input.conversationId} from:${input.username} -is:retweet`
  const endpoints = [
    "https://api.x.com/2/tweets/search/all",
    "https://api.x.com/2/tweets/search/recent",
  ]

  for (const endpoint of endpoints) {
    const collected: XBookmarksPage = {
      data: [],
      includes: { users: [], tweets: [], media: [] },
    }
    let nextToken: string | null = null
    let supported = true

    do {
      const url = new URL(endpoint)
      setPostRequestFields(url)
      url.searchParams.set("query", query)
      url.searchParams.set("max_results", "100")
      if (nextToken) {
        url.searchParams.set("next_token", nextToken)
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${input.accessToken}` },
      })

      if (!response.ok) {
        supported = false
        break
      }

      const page = (await response.json()) as XBookmarksPage
      collected.data?.push(...(page.data ?? []))
      collected.includes?.users?.push(...(page.includes?.users ?? []))
      collected.includes?.tweets?.push(...(page.includes?.tweets ?? []))
      collected.includes?.media?.push(...(page.includes?.media ?? []))
      nextToken = page.meta?.next_token ?? null
    } while (nextToken)

    if (supported) {
      return collected
    }
  }

  throw new XThreadSearchUnavailableError()
}

export async function fetchAuthorTimeline(input: {
  accessToken: string
  xUserId: string
  startTime: string
  endTime: string
}): Promise<XBookmarksPage> {
  const collected: XBookmarksPage = {
    data: [],
    includes: { users: [], tweets: [], media: [] },
  }
  let paginationToken: string | null = null

  do {
    const url = new URL(`${bookmarksEndpoint}/${input.xUserId}/tweets`)
    setPostRequestFields(url)
    url.searchParams.set("max_results", "100")
    url.searchParams.set("start_time", input.startTime)
    url.searchParams.set("end_time", input.endTime)
    if (paginationToken) {
      url.searchParams.set("pagination_token", paginationToken)
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    })

    if (!response.ok) {
      throw new XApiError(`X author timeline fetch failed with status ${response.status}`, response.status)
    }

    const page = (await response.json()) as XBookmarksPage
    collected.data?.push(...(page.data ?? []))
    collected.includes?.users?.push(...(page.includes?.users ?? []))
    collected.includes?.tweets?.push(...(page.includes?.tweets ?? []))
    collected.includes?.media?.push(...(page.includes?.media ?? []))
    paginationToken = page.meta?.next_token ?? null
  } while (paginationToken)

  return collected
}

function setPostRequestFields(url: URL) {
  url.searchParams.set(
    "tweet.fields",
    "attachments,author_id,conversation_id,created_at,entities,in_reply_to_user_id,lang,note_tweet,public_metrics,referenced_tweets",
  )
  url.searchParams.set(
    "expansions",
    "author_id,attachments.media_keys,referenced_tweets.id,referenced_tweets.id.author_id,referenced_tweets.id.attachments.media_keys",
  )
  url.searchParams.set("user.fields", "profile_image_url,username,name")
  url.searchParams.set(
    "media.fields",
    "alt_text,duration_ms,height,media_key,preview_image_url,type,url,variants,width",
  )
}
