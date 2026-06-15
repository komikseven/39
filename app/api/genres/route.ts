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

/**
 * Scrape genre dari halaman /genres/ komik7.my.id
 * Genre ada di sana sebagai list link: /genres/[slug]/
 * Ini JAUH lebih akurat daripada /wp/v2/tags yang isinya judul komik
 */
async function scrapeGenres(): Promise<Genre[]> {
  const res = await fetch(`${SITE_BASE}/genres/`, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 3600 },
  })
  if (!res.ok) return []
  const html = await res.text()

  // Pola: <a href="/genres/action/">Action <em>259</em></a>
  // atau:  Action *259*  (dari markdown parser)
  const matches = [
    ...html.matchAll(/href="https?:\/\/komik7\.my\.id\/genres\/([^/]+)\/"[^>]*>\s*([^<(]+?)(?:\s*<em[^>]*>(\d+)<\/em>|)\s*</gi),
  ]

  const genres: Genre[] = []
  let id = 1
  for (const m of matches) {
    const slug = m[1].trim()
    const name = m[2].trim()
    const count = m[3] ? parseInt(m[3]) : 0
    if (!slug || !name || slug === "genres") continue
    // Skip genre noise dengan count sangat kecil (opsional)
    genres.push({ id: id++, name, slug, count })
  }
  return genres
}

export async function GET() {
  try {
    const genres = await cached("komiku:genres:v2", TTL.genres, scrapeGenres)
    return NextResponse.json(genres)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
