import { type NextRequest, NextResponse } from "next/server"

const allowedVideoHost = "video.twimg.com"

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("url")

  if (!source) {
    return NextResponse.json({ error: "Missing video URL" }, { status: 400 })
  }

  let url: URL
  try {
    url = new URL(source)
  } catch {
    return NextResponse.json({ error: "Invalid video URL" }, { status: 400 })
  }

  if (url.protocol !== "https:" || url.hostname !== allowedVideoHost) {
    return NextResponse.json({ error: "Video host is not allowed" }, { status: 403 })
  }

  const range = request.headers.get("range")
  const upstream = await fetch(url, {
    headers: {
      Accept: "video/mp4,video/*;q=0.9,*/*;q=0.8",
      Referer: "https://x.com/",
      "User-Agent": "Mozilla/5.0 BookmarX/1.0",
      ...(range ? { Range: range } : {}),
    },
    cache: "no-store",
    signal: request.signal,
  })

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json(
      { error: `X video request failed with status ${upstream.status}` },
      { status: upstream.status },
    )
  }

  const headers = new Headers()
  for (const name of [
    "accept-ranges",
    "cache-control",
    "content-length",
    "content-range",
    "content-type",
    "etag",
    "last-modified",
  ]) {
    const value = upstream.headers.get(name)
    if (value) {
      headers.set(name, value)
    }
  }
  headers.set("Content-Disposition", "inline")

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  })
}
