import { type NextRequest, NextResponse } from "next/server"
import { cached, TTL } from "@/lib/redis"

const API_BASE = "https://komik7.my.id/wp-json/wp/v2"

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ slug: "" })

  try {
    const slug = await cached(
      `komiku:cat-slug:${id}`,
      TTL.series,
      async () => {
        const res = await fetch(`${API_BASE}/categories/${id}?_fields=id,slug`, {
          headers: { Accept: "application/json" },
          next: { revalidate: 3600 },
        })
        if (!res.ok) return ""
        const data = await res.json() as { slug?: string }
        return data.slug ?? ""
      }
    )
    return NextResponse.json({ slug })
  } catch {
    return NextResponse.json({ slug: "" })
  }
}
