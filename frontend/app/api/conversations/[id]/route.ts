import { type NextRequest, NextResponse } from "next/server"

const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { cookies } = await import("next/headers")
  const cookieStore = await cookies()
  const response = await fetch(`${apiUrl}/conversations/${id}`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  })
  if (!response.ok) {
    return NextResponse.json({ error: "Conversation not found" }, { status: response.status })
  }
  return new NextResponse(response.body, { status: 200, headers: { "content-type": "application/json" } })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { cookies } = await import("next/headers")
  const cookieStore = await cookies()
  const body = await req.json()
  const response = await fetch(`${apiUrl}/conversations/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: cookieStore.toString() },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    return NextResponse.json({ error: "Failed to update conversation" }, { status: response.status })
  }
  return new NextResponse(response.body, { status: 200, headers: { "content-type": "application/json" } })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { cookies } = await import("next/headers")
  const cookieStore = await cookies()
  const response = await fetch(`${apiUrl}/conversations/${id}`, {
    method: "DELETE",
    headers: { cookie: cookieStore.toString() },
  })
  if (!response.ok) {
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: response.status })
  }
  return new NextResponse(response.body, { status: 200, headers: { "content-type": "application/json" } })
}
