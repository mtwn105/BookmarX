import { type NextRequest, NextResponse } from "next/server"

const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const cookie = req.headers.get("cookie") ?? ""

  const backendRes = await fetch(`${apiUrl}/ai/chat/stream`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!backendRes.ok) {
    return NextResponse.json({ error: "Failed to get answer" }, { status: backendRes.status })
  }

  const sourcesHeader = backendRes.headers.get("X-Sources") ?? "[]"

  const responseHeaders: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    "X-Sources": sourcesHeader,
  }

  return new NextResponse(backendRes.body, {
    status: 200,
    headers: responseHeaders,
  })
}
