import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const SITE_BASE = "https://komik7.my.id"
const API_BASE = "https://komik7.my.id/wp-json/wp/v2"

export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get("slug")
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 })

  const url = `${SITE_BASE}/manga/${slug}/`
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })
  if (!res.ok) return NextResponse.json({ error: `HTTP ${res.status} for ${url}` })
  const html = await res.text()

  const snip = (keyword: string, after = 300) => {
    const i = html.search(new RegExp(keyword, "i"))
    return i >= 0 ? html.slice(Math.max(0, i - 20), i + after) : "NOT FOUND"
  }

  // WP tags lookup
  let wpTags: string[] = []
  try {
    const catRes = await fetch(`${API_BASE}/categories?slug=${slug}&per_page=1&_fields=id`)
    if (catRes.ok) {
      const cats = await catRes.json() as Array<{ id: number }>
      if (cats.length > 0) {
        const postRes = await fetch(`${API_BASE}/posts?categories=${cats[0].id}&per_page=1&_fields=tags`)
        if (postRes.ok) {
          const posts = await postRes.json() as Array<{ tags?: number[] }>
          if (posts[0]?.tags?.length) {
            const tagRes = await fetch(`${API_BASE}/tags?include=${posts[0].tags.join(",")}&per_page=20&_fields=name`)
            if (tagRes.ok) {
              const tags = await tagRes.json() as Array<{ name: string }>
              wpTags = tags.map(t => t.name)
            }
          }
        }
      }
    }
  } catch { /* ignore */ }

  return NextResponse.json({
    htmlLength: html.length,
    ogImage: html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/)?.[1],

    // Type detection
    typeP1: html.match(/[?&](?:amp;)?type=(Manga|Manhwa|Manhua)/i)?.[1],
    typeP2: html.match(/(?:Tipe|Type)[^<]*<\/[^>]+>[\s\S]{0,100}(Manga|Manhwa|Manhua)/i)?.[1],
    typeP5_manhua: /\bManhua\b/i.test(html.slice(0, 8000)),
    typeP5_manhwa: /\bManhwa\b/i.test(html.slice(0, 8000)),
    typeSnippet: snip("Tipe|Manhua|Manhwa", 300),
    wpTags,
    wpTagsMangaType: wpTags.find(t => /manhua|manhwa|manga/i.test(t)),

    // Sinopsis
    ogDescription: html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/)?.[1]?.slice(0, 300),
    sinopsisSnippet: snip("Sinopsis|Synopsis", 500),

    // Score & Status
    statusSnippet: snip("Ongoing|Completed|Hiatus|Tamat", 200),
    ratingSnippet: snip("Rating|rating", 200),
    scoreP4: html.match(/itemprop="ratingValue"[^>]*>\s*(\d+(?:[.,]\d+)?)/i)?.[1],
  })
}
