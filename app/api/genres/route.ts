import { NextResponse } from "next/server"
import { cached, TTL } from "@/lib/redis"

export const runtime = "nodejs"
export const revalidate = 0

const SITE_BASE = "https://komik7.my.id"

interface Genre {
  id: number
  name: string
  slug: string
  count: number
}

async function fetchGenres(): Promise<Genre[]> {
  // Gunakan endpoint custom komik7 — tersedia di /wp-json/komik7/v1/genres
  const res = await fetch(`${SITE_BASE}/wp-json/komik7/v1/genres`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 3600 },
  })

  if (res.ok) {
    const data = await res.json()
    if (Array.isArray(data) && data.length > 0) {
      return data.map((g: Genre, i: number) => ({
        id: g.id ?? i + 1,
        name: g.name,
        slug: g.slug,
        count: g.count ?? 0,
      }))
    }
  }

  // Fallback: WP Categories API
  const res2 = await fetch(
    `${SITE_BASE}/wp-json/wp/v2/categories?per_page=100&_fields=id,name,slug,count&orderby=name&order=asc&hide_empty=true`,
    { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 3600 } }
  )
  if (!res2.ok) return []

  const cats = await res2.json() as Genre[]
  const SKIP = new Set(["uncategorized", "manga", "manhwa", "manhua"])
  return cats
    .filter(c => c.count > 0 && !SKIP.has(c.slug) && c.name.split(" ").length <= 4 && c.slug.length <= 30)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function GET() {
  try {
    const genres = await cached("komiku:genres:v7", TTL.genres, fetchGenres)
    return NextResponse.json(genres)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
