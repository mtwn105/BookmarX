import { type NextRequest, NextResponse } from "next/server"

const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export async function GET() {
  const { cookies } = await import("next/headers")
  const cookieStore = await cookies()
  const response = await fetch(`${apiUrl}/conversations`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  })
  if (!response.ok) {
    return NextResponse.json({ error: "Failed to load conversations" }, { status: response.status })
  }
  return new NextResponse(response.body, { status: 200, headers: { "content-type": "application/json" } })
}

export async function POST(req: NextRequest) {
  const { cookies } = await import("next/headers")
  const cookieStore = await cookies()
  const body = await req.json().catch(() => ({}))
  const response = await fetch(`${apiUrl}/conversations`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: cookieStore.toString() },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    return NextResponse.json({ error: "Failed to create conversation" }, { status: response.status })
  }
  return new NextResponse(response.body, { status: 201, headers: { "content-type": "application/json" } })
}
