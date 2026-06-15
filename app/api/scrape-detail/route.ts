import { NextRequest, NextResponse } from "next/server"
import { cached, TTL } from "@/lib/redis"

export const runtime = "nodejs"
export const revalidate = 0

const SITE_BASE = "https://komik7.my.id"

function decodeHtml(text: string): string {
  return (text || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&nbsp;/g, " ")
}

/**
 * Deteksi mangaType dari HTML halaman detail komik7.my.id.
 *
 * Strategi berurutan (berhenti saat dapat hasil):
 *
 * 1. WP REST API: custom taxonomy `ero_type` (plugin WPManga/madara)
 *    GET /wp-json/wp/v2/ero_type?post={postId}&_fields=name
 *    → field name langsung berisi "Manhua" / "Manhwa" / "Manga"
 *
 * 2. HTML: span/badge tipe komik di dalam blok info
 *    <span class="... type ...">Manhua</span>  atau  <div ...>Manhua</div>
 *    Pola MangaStream / Madara yang umum di komik7
 *
 * 3. HTML: link ?type=Manhua di DALAM konten halaman detail
 *    (di beberapa tema muncul sebagai breadcrumb atau related posts)
 *
 * 4. HTML: cari kata "Manhua" / "Manhwa" di blok info (200 char pertama
 *    setelah heading judul) — lebih presisi dari scan 8000 char
 *
 * 5. WP REST API: category slug yang mengandung tipe
 *    GET /wp-json/wp/v2/categories?post={postId}&_fields=slug,name
 *    → cek slug/name mengandung manhua/manhwa/manga
 *
 * 6. Fallback: "Manga" (default)
 */
async function detectMangaType(html: string, wpPostId?: number): Promise<string> {

  // ── Strategi 1: WP custom taxonomy `ero_type` (madara/mangastream plugin) ──
  if (wpPostId) {
    try {
      const eroRes = await fetch(
        `${SITE_BASE}/wp-json/wp/v2/ero_type?post=${wpPostId}&per_page=5&_fields=name,slug`,
        { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 3600 } }
      )
      if (eroRes.ok) {
        const eroTypes = await eroRes.json() as Array<{ name: string; slug: string }>
        for (const t of eroTypes) {
          const n = (t.name || t.slug || "").toLowerCase()
          if (n.includes("manhua")) return "Manhua"
          if (n.includes("manhwa")) return "Manhwa"
          if (n.includes("manga")) return "Manga"
        }
      }
    } catch { /* lanjut */ }

    // ── Strategi 5: WP category yang mengandung type ──
    try {
      const catRes = await fetch(
        `${SITE_BASE}/wp-json/wp/v2/categories?post=${wpPostId}&per_page=20&_fields=name,slug`,
        { headers: { "User-Agent": "Mozilla/5.0" }, next: { revalidate: 3600 } }
      )
      if (catRes.ok) {
        const cats = await catRes.json() as Array<{ name: string; slug: string }>
        for (const c of cats) {
          const s = (c.slug || c.name || "").toLowerCase()
          if (s.includes("manhua")) return "Manhua"
          if (s.includes("manhwa")) return "Manhwa"
        }
      }
    } catch { /* lanjut */ }
  }

  // ── Strategi 2: span/div tipe di blok info HTML ──
  // Pola umum tema Madara/MangaStream: <span class="item-head">Type :</span> <a ...>Manhwa</a>
  // atau <span class="type">Manhua</span>
  const typeBlockPatterns = [
    // "Type :" diikuti link/span dengan nama tipe — pola Madara
    /(?:Type|Tipe)\s*:?\s*<\/[^>]+>\s*(?:<[^>]+>)*\s*(Manhua|Manhwa|Manga)/i,
    // span/div/a dengan class mengandung "type"
    /class="[^"]*\btype\b[^"]*"[^>]*>\s*(?:<[^>]+>)*\s*(Manhua|Manhwa|Manga)/i,
    // dt/th "Type" → dd/td berikutnya
    /<(?:dt|th)[^>]*>[^<]*(?:Type|Tipe)[^<]*<\/(?:dt|th)>\s*<(?:dd|td)[^>]*>\s*(?:<[^>]+>)*\s*(Manhua|Manhwa|Manga)/i,
    // li dengan label "Type"
    /<li[^>]*>[^<]*(?:Type|Tipe)[^<]*:\s*(?:<[^>]+>)*\s*(Manhua|Manhwa|Manga)/i,
    // Pola tema komik7 spesifik: badge tipe di card header
    /<span[^>]*>\s*(Manhua|Manhwa|Manga)\s*<\/span>/i,
  ]
  for (const pat of typeBlockPatterns) {
    const m = html.match(pat)
    if (m) return m[1]
  }

  // ── Strategi 3: link ?type= di dalam HTML detail ──
  // Bisa muncul di breadcrumb, related section, atau tags
  const typeLinkMatch = html.match(/[?&](?:amp;)?type=(Manhua|Manhwa|Manga)(?:[^a-zA-Z]|$)/i)
  if (typeLinkMatch) return typeLinkMatch[1]

  // ── Strategi 4: scan blok info setelah judul ──
  // Cari blok pertama setelah <h1> atau class="post-title"
  const infoBlockMatch = html.match(
    /(?:<h1[^>]*>[\s\S]{0,200}<\/h1>|class="(?:post-title|entry-title|series-title)[^"]*"[^>]*>[\s\S]{0,200}<\/[^>]+>)([\s\S]{0,1500})/i
  )
  if (infoBlockMatch) {
    const block = infoBlockMatch[1]
    if (/\bManhua\b/i.test(block)) return "Manhua"
    if (/\bManhwa\b/i.test(block)) return "Manhwa"
    if (/\bManga\b/i.test(block)) return "Manga"
  }

  // ── Strategi 4b: scan 3000 char PERTENGAHAN HTML (skip head/meta) ──
  // Mulai dari char 5000 untuk melewati head, ambil 3000 char
  const htmlMid = html.slice(5000, 8000)
  if (/\bManhua\b/i.test(htmlMid)) return "Manhua"
  if (/\bManhwa\b/i.test(htmlMid)) return "Manhwa"
  if (/\bManga\b/i.test(htmlMid)) return "Manga"

  return "Manga" // fallback default
}

/**
 * Ekstrak WP Post ID dari HTML — biasanya ada di:
 * - <body class="... postid-12345 ...">
 * - var postID = 12345
 * - <link rel="shortlink" href="...?p=12345">
 */
function extractPostId(html: string): number | undefined {
  // Pola 1: body class "postid-XXXXX"
  const bodyClassMatch = html.match(/\bpostid-(\d+)\b/)
  if (bodyClassMatch) return parseInt(bodyClassMatch[1])

  // Pola 2: shortlink ?p=XXXXX
  const shortlinkMatch = html.match(/\?p=(\d+)/)
  if (shortlinkMatch) return parseInt(shortlinkMatch[1])

  // Pola 3: JS variable
  const jsMatch = html.match(/(?:postID|post_id|postId)\s*[:=]\s*["']?(\d+)["']?/)
  if (jsMatch) return parseInt(jsMatch[1])

  // Pola 4: wp-json link di head
  const wpJsonMatch = html.match(/\/wp-json\/wp\/v2\/(?:posts|manga)\/(\d+)/)
  if (wpJsonMatch) return parseInt(wpJsonMatch[1])

  return undefined
}

async function scrapeDetail(slug: string) {
  const url = `${SITE_BASE}/manga/${slug}/`
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    next: { revalidate: 3600 },
  })
  if (!res.ok) return {}
  const html = await res.text()

  // Ekstrak WP Post ID dulu — dibutuhkan untuk WP REST API calls
  const wpPostId = extractPostId(html)

  // 1. Thumbnail — dari og:image (coba kedua urutan atribut, WP sering balik-balik)
  let thumbnail: string | undefined
  const ogImgMatch1 = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/)
  const ogImgMatch2 = html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/)
  const rawThumb = (ogImgMatch1 || ogImgMatch2)?.[1]
  if (rawThumb && !rawThumb.includes('cropped-KOMIK7') && !rawThumb.includes('favicon')) {
    thumbnail = rawThumb
  }
  if (!thumbnail) {
    const thumbDivMatch = html.match(/<div[^>]*class="[^"]*(?:thumb|cover|series-thumb)[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/)
    if (thumbDivMatch) thumbnail = thumbDivMatch[1]
  }

  // 2. MangaType — gunakan strategi baru
  const mangaType = await detectMangaType(html, wpPostId)

  // 3. Sinopsis
  let sinopsis: string | undefined

  const descDivMatch = html.match(/<div[^>]*itemprop="description"[^>]*>([\s\S]*?)<\/div>/i)
  if (descDivMatch) {
    let raw = descDivMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
    raw = decodeHtml(raw)
    if (raw.length >= 30) sinopsis = raw
  }

  if (!sinopsis || sinopsis.length < 30) {
    const sinopsisBlockMatch = html.match(
      /(?:Sinopsis|Synopsis)[^<]*<\/h[2-4]>([\s\S]*?)(?=<(?:table|div[^>]*class="[^"]*(?:manga-info|series-info|post-info|info-manga|chapter|eplister))[^>]*>|<h[2-4][^>]*>(?:Chapter|Daftar))/i
    )
    if (sinopsisBlockMatch) {
      let raw = sinopsisBlockMatch[1]
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
      raw = decodeHtml(raw)
      const cutoff = raw.search(/(?:Dirilis|Penulis|Serialisasi|Status|Artist)\s*:\s*\S|Dirilis\s+\d{4}/i)
      if (cutoff > 30) raw = raw.slice(0, cutoff).trim()
      if (raw.length >= 30) sinopsis = raw
    }
  }

  if (!sinopsis || sinopsis.length < 30) {
    const summaryMatch = html.match(
      /<div[^>]*class="[^"]*(?:summary__content|manga-excerpt|entry-summary|description-summary)[^"]*"[^>]*>([\s\S]*?)<\/div>/i
    )
    if (summaryMatch) {
      let raw = summaryMatch[1]
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
      raw = decodeHtml(raw)
      if (raw.length >= 30) sinopsis = raw
    }
  }

  if (!sinopsis || sinopsis.length < 30) {
    const ogDescMatch =
      html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/) ||
      html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:description"/)
    if (ogDescMatch) sinopsis = decodeHtml(ogDescMatch[1])
  }

  if (!sinopsis || sinopsis.length < 30) {
    const metaDescMatch =
      html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/) ||
      html.match(/<meta[^>]+content="([^"]+)"[^>]+name="description"/)
    if (metaDescMatch) sinopsis = decodeHtml(metaDescMatch[1])
  }

  // 4. Score
  let score: string | undefined
  const scorePatterns = [
    /(?:rating|nilai)[^<]*<\/[^>]+>\s*<[^>]+>\s*(\d+(?:[.,]\d+)?)/i,
    /(\d+(?:[.,]\d+)?)\s*<\/[^>]+>\s*[^<]*(?:rating|score)/i,
    /class="[^"]*(?:rating|score)[^"]*"[^>]*>\s*(\d+(?:[.,]\d+)?)/i,
    /itemprop="ratingValue"[^>]*>\s*(\d+(?:[.,]\d+)?)/i,
    /ratingValue[^>]*content="(\d+(?:[.,]\d+)?)"/i,
  ]
  for (const pat of scorePatterns) {
    const m = html.match(pat)
    if (m) { score = m[1].replace(",", "."); break }
  }

  // 5. Status
  let status: string | undefined
  const statusPatterns = [
    /Status\s*<i>(Ongoing|Completed|Hiatus)<\/i>/i,
    /Status\s*<\/(?:b|strong|span|td|th|dt)[^>]*>\s*(?:<[^>]+>)*\s*(Ongoing|Completed|Hiatus|Tamat|Berlangsung)/i,
    /Status[^<]*<\/[^>]+>\s*<[^>]+>\s*(Ongoing|Completed|Hiatus|Tamat|Berlangsung)/i,
    /"status"[^>]*>\s*<[^>]+>\s*(Ongoing|Completed|Hiatus)/i,
    /(?:Ongoing|Completed|Hiatus|Tamat|Berlangsung)(?=\s*<\/(?:span|a|em|td|li|i))/i,
  ]
  for (const pat of statusPatterns) {
    const m = html.match(pat)
    if (m) {
      status = m[1] || m[0].match(/(Ongoing|Completed|Hiatus|Tamat|Berlangsung)/i)?.[1]
      if (status?.toLowerCase() === "tamat") status = "Completed"
      if (status?.toLowerCase() === "berlangsung") status = "Ongoing"
      break
    }
  }

  // 6. Author & Artist
  let author: string | undefined
  let artist: string | undefined
  const authorMatch = html.match(/Penulis\s*<\/[^>]+>\s*<[^>]+>([^<]+)</)
  if (authorMatch) author = decodeHtml(authorMatch[1].trim())
  const artistMatch = html.match(/Artist\s*<\/[^>]+>\s*<[^>]+>([^<]+)</)
  if (artistMatch) artist = decodeHtml(artistMatch[1].trim())

  // 7. Genre
  const genreMatches = [...html.matchAll(/\/genres\/([^/]+)\/[^>]*>([^<]+)</gi)]
  const genres = genreMatches
    .map(m => decodeHtml(m[2].trim()))
    .filter(g => g.length > 0 && g.length < 30)

  return { mangaType, sinopsis, thumbnail, score, status, author, artist, genres }
}

export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get("slug")
  if (!slug) return NextResponse.json({}, { status: 400 })

  try {
    const detail = await cached(
      `komiku:detail:v4:${slug}`,
      TTL.seriesDetail,
      () => scrapeDetail(slug)
    )
    return NextResponse.json(detail)
  } catch {
    return NextResponse.json({})
  }
}
