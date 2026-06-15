import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const SITE_BASE = "https://komik7.my.id"

function decodeHtml(text: string): string {
  return (text || "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&#8217;/g, "'").replace(/&#8211;/g, "-").replace(/&nbsp;/g, " ")
}

/**
 * Scrape halaman list komik dari komik7.my.id
 * Support: /genres/[slug]/ dan /manga/?type=Manhwa
 *
 * Struktur kartu di HTML:
 *   <div class="..."> ... <a href="https://komik7.my.id/manga/[slug]/" ...>
 *     <img ... title="Komik XYZ" ...>
 *     <span class="...">Manhwa</span>
 *   </a>
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const targetUrl = searchParams.get("url")
  if (!targetUrl) return NextResponse.json({ series: [], totalPages: 1 })

  try {
    const res = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 1800 },
    })
    if (!res.ok) return NextResponse.json({ series: [], totalPages: 1 })
    const html = await res.text()

    // Parse kartu series
    // Pola: href="/manga/[slug]/" diikuti img dengan title="..."
    const seen = new Set<string>()
    const series: Array<{
      id: number; name: string; slug: string; count: number;
      thumbnail?: string; mangaType?: string
    }> = []

    // Helper: ekstrak src dari tag <img ...>
    function extractImgSrc(imgTag: string): string | undefined {
      // Prioritas: data-src (lazy load) → src
      const dataSrc = imgTag.match(/data-src="([^"]+)"/)
      if (dataSrc) return dataSrc[1]
      const src = imgTag.match(/\bsrc="([^"]+)"/)
      return src ? src[1] : undefined
    }

    // Match tiap blok kartu:
    //   href="/manga/[slug]/" → <img ...src="..." title="..."> → opsional type
    // Blok dibatasi sampai </a> berikutnya (max 2000 char untuk keamanan)
    const cardBlockRegex = /href="https?:\/\/komik7\.my\.id\/manga\/([^/]+)\/"[^>]*>([\s\S]{0,2000}?)<\/a>/gi
    let m: RegExpExecArray | null
    while ((m = cardBlockRegex.exec(html)) !== null) {
      const slug = m[1]
      const block = m[2]
      if (!slug || slug === "manga" || seen.has(slug)) continue

      // title komik dari img title attribute
      const titleMatch = block.match(/<img[^>]+title="([^"]+)"/)
      if (!titleMatch) continue
      const rawName = decodeHtml(titleMatch[1])

      // src thumbnail dari img di dalam blok yang sama
      const imgTagMatch = block.match(/<img[^>]+>/)
      const thumbnail = imgTagMatch ? extractImgSrc(imgTagMatch[0]) : undefined

      // type dari link ?type=Manhwa
      const typeMatch = block.match(/\?[^"]*type=(Manga|Manhwa|Manhua)/i)
      const mangaType = typeMatch ? typeMatch[1] : undefined

      seen.add(slug)
      series.push({
        id: series.length + 1,
        name: rawName.replace(/^Komik\s+/i, ""),
        slug,
        count: 0,
        thumbnail,
        mangaType,
      })
    }

    // Fallback parser kalau regex di atas tidak match (pola HTML berbeda)
    if (series.length === 0) {
      const hrefMatches = [...html.matchAll(/href="(https?:\/\/komik7\.my\.id\/manga\/([^/]+)\/)"[^>]*>\s*(<img[^>]+>)/gi)]
      for (const hm of hrefMatches) {
        const slug = hm[2]
        const imgTag = hm[3]
        const titleMatch = imgTag.match(/title="([^"]+)"/)
        if (!titleMatch) continue
        const rawName = decodeHtml(titleMatch[1])
        if (!slug || slug === "manga" || seen.has(slug)) continue
        seen.add(slug)
        series.push({
          id: series.length + 1,
          name: rawName.replace(/^Komik\s+/i, ""),
          slug,
          count: 0,
          thumbnail: extractImgSrc(imgTag),
        })
      }
    }

    // Deteksi total pages dari pagination
    // Cari angka page terbesar di link pagination
    const pageNums = [...html.matchAll(/\/page\/(\d+)\//g)].map(pm => parseInt(pm[1]))
    const maxPage = pageNums.length > 0 ? Math.max(...pageNums) : 1
    // Cek apakah ada "next page" link
    const currentPageMatch = targetUrl.match(/\/page\/(\d+)/)
    const currentPage = currentPageMatch ? parseInt(currentPageMatch[1]) : 1
    const totalPages = Math.max(maxPage, currentPage)

    return NextResponse.json({ series, totalPages })
  } catch (e) {
    console.error("scrape-list error:", e)
    return NextResponse.json({ series: [], totalPages: 1 })
  }
}
