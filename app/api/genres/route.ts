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
  const res = await fetch(`${SITE_BASE}/genres/`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 3600 },
  })
  if (!res.ok) return []
  const html = await res.text()

  // Pakai pola SAMA dengan scrape-detail yang sudah terbukti benar
  const matches = [...html.matchAll(/\/genres\/([^/]+)\/[^>]*>([^<]+)</gi)]

  const genres: Genre[] = []
  const seen = new Set<string>()
  let id = 1

  for (const m of matches) {
    const slug = m[1].trim()
    const name = m[2].trim()
    if (!slug || !name) continue
    if (seen.has(slug)) continue
    if (["genres", "genre"].includes(slug)) continue
    seen.add(slug)
    genres.push({ id: id++, name, slug, count: 0 })
  }

  return genres
}

export async function GET() {
  try {
    const genres = await cached("komiku:genres:v5", TTL.genres, fetchGenres)
    return NextResponse.json(genres)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
