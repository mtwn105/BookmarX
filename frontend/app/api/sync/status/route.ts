import { type NextRequest, NextResponse } from "next/server"

const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export async function GET(request: NextRequest) {
  const cookie = request.headers.get("cookie") ?? ""
  const response = await fetch(`${apiUrl}/sync/status`, {
    headers: cookie ? { cookie } : undefined,
    cache: "no-store",
  })

  if (!response.ok) {
    return NextResponse.json({ error: "Unable to load sync status" }, { status: response.status })
  }

  return new NextResponse(response.body, {
    status: 200,
    headers: { "content-type": "application/json" },
  })
}
