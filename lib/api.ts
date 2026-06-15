export const API_BASE = "https://komik7.my.id/wp-json/wp/v2"
export const SITE_BASE = "https://komik7.my.id"

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface Genre {
  id: number
  name: string
  slug: string
  count: number
}

export interface MangaType {
  slug: "manga" | "manhwa" | "manhua"
  label: string
  emoji: string
  description: string
}

export const MANGA_TYPES: MangaType[] = [
  { slug: "manga",  label: "Manga",  emoji: "🇯🇵", description: "Komik dari Jepang" },
  { slug: "manhwa", label: "Manhwa", emoji: "🇰🇷", description: "Komik dari Korea" },
  { slug: "manhua", label: "Manhua", emoji: "🇨🇳", description: "Komik dari China" },
]

export interface Series {
  id: number
  name: string
  slug: string           // post_name dari WP, e.g. "komik-one-piece"
  count: number
  description?: string   // sinopsis bersih (plain text)
  thumbnail?: string     // URL cover
  genres?: Genre[]
  mangaType?: string     // "Manga" | "Manhwa" | "Manhua"
  status?: string        // "Ongoing" | "Completed"
  score?: string
  author?: string
  artist?: string
  altTitle?: string
}

export interface Chapter {
  id: number
  title: string
  link: string
  date: string
  chapterNumber: string
  seriesTitle: string
  seriesSlug: string   // slug series untuk fetch cover via /api/scrape-detail
  seriesId: number
  categories: number[]
  categoryId: number
  contentHtml: string
  thumbnail: string
  images: string[]
}

export interface MenuItem {
  id: number
  title: string
  url: string
}

// ─── Utilities ───────────────────────────────────────────────────────────────

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

export function extractImages(contentRendered: string): string[] {
  const regex = /<img[^>]+src="([^">]+)"/gi
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = regex.exec(contentRendered || "")) !== null) {
    out.push(m[1])
  }
  return out
}

export function proxyImage(src: string): string {
  if (!src || src.startsWith("/")) return src || "/manga-placeholder.png"
  return `/api/img?url=${encodeURIComponent(src)}`
}

export function getThumbnail(contentRendered: string): string {
  const imgs = extractImages(contentRendered)
  return imgs.length > 0 ? imgs[0] : "/manga-placeholder.png"
}

// ─── HTML Scraper untuk detail series ────────────────────────────────────────
// Data ada di halaman HTML: komik7.my.id/manga/[slug]/
// Struktur HTML yang terdeteksi:
//   - Tipe: teks di link ?type=Manhwa dsb, atau teks "Tipe [Manhwa]"
//   - Sinopsis: teks di bawah heading "Sinopsis..."
//   - Thumbnail: meta og:image
//   - Score: teks angka di halaman

export interface ScrapedSeriesDetail {
  mangaType?: string
  sinopsis?: string
  thumbnail?: string
  score?: string
  status?: string
  author?: string
  artist?: string
  altTitle?: string
  genres?: string[]
}

/**
 * Scrape halaman detail series dari komik7.my.id/manga/[slug]/
 * Digunakan sebagai SATU-SATUNYA sumber untuk type & sinopsis
 * karena WP REST API tidak expose custom post type 'manga'
 */
export async function scrapeSeriesDetail(slug: string): Promise<ScrapedSeriesDetail> {
  try {
    const url = `${SITE_BASE}/manga/${slug}/`
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return {}
    const text = await res.text()

    // 1. Thumbnail
    // og:image hanya valid jika bukan logo situs (cropped-KOMIK7.png)
    // Prioritas: gambar pertama di body (![alt](url.jpg))
    let thumbnail: string | undefined
    const bodyImgMatch = text.match(/!\[[^\]]*\]\((https?:\/\/[^\s)"]+\.(?:jpg|jpeg|png|webp))/i)
    if (bodyImgMatch) {
      thumbnail = bodyImgMatch[1]
    } else {
      // fallback og:image jika bukan logo
      const ogMatch = text.match(/meta-og:image:\s*(https:\/\/\S+\.(?:jpg|jpeg|png|webp))/i)
      if (ogMatch && !ogMatch[1].includes('cropped-KOMIK7')) {
        thumbnail = ogMatch[1].trim()
      }
    }

    // 2. Type dari "Tipe [Manhwa](...)"
    let mangaType: string | undefined
    const typeMatch = text.match(/Tipe\s*\[(Manga|Manhwa|Manhua)\]/i)
    if (typeMatch) mangaType = typeMatch[1]

    // 3. Sinopsis dari "## Sinopsis Komik ..."
    let sinopsis: string | undefined
    const sinopsisMatch = text.match(/##\s*Sinopsis[^\n]*\n+([^#\n][^\n]+(?:\n(?![#*\n])[^\n]+)*)/i)
    if (sinopsisMatch) {
      sinopsis = sinopsisMatch[1]
        .replace(/\*\*[^*]+\*\*/g, "")
        .replace(/\[[^\]]+\]\([^)]+\)/g, "")
        .replace(/\s+/g, " ")
        .trim()
      if (sinopsis.length < 15) sinopsis = undefined
    }
    // fallback meta-description (jika bukan deskripsi situs)
    if (!sinopsis) {
      const metaDescMatch = text.match(/meta-description:\s*([^\n]+)/i)
      if (metaDescMatch && !metaDescMatch[1].includes('website baca komik')) {
        sinopsis = metaDescMatch[1].trim()
      }
    }

    // 4. Score dari "Bookmark\n\n6.7\n\nStatus"
    let score: string | undefined
    const scoreMatch = text.match(/Bookmark\s*\n+(\d+(?:\.\d+)?)\s*\n/i)
    if (scoreMatch) score = scoreMatch[1]

    // 5. Status dari "Status *Ongoing*"
    let status: string | undefined
    const statusMatch = text.match(/Status\s*\*(Ongoing|Completed|Hiatus)\*/i)
    if (statusMatch) status = statusMatch[1]

    // 6. Author & Artist
    let author: string | undefined
    let artist: string | undefined
    const authorMatch = text.match(/\*\*Penulis\*\*\s+([^\n\[]+?)(?:\s*\[|\s*\n)/i)
    if (authorMatch) author = authorMatch[1].trim()
    const artistMatch = text.match(/\*\*Artist\*\*\s+([^\n\[]+?)(?:\s*\[|\s*\n)/i)
    if (artistMatch) artist = artistMatch[1].trim()

    // 7. Genre dari "[Action](https://...genres/action/)"
    const genreMatches = [...text.matchAll(/\[([A-Za-z ]+)\]\(https?:\/\/[^)]*\/genres\/[^)]+\)/gi)]
    const genres = [...new Set(genreMatches.map(m => m[1].trim()).filter(g => g.length > 1 && g.length < 30))]

    return { mangaType, sinopsis, thumbnail, score, status, author, artist, genres }
  } catch {
    return {}
  }
}

// ─── WP REST API helpers ──────────────────────────────────────────────────────

interface RawPost {
  id: number
  title?: { rendered?: string }
  link?: string
  date?: string
  meta?: Record<string, unknown>
  categories?: number[]
  content?: { rendered?: string }
}

interface RawCategory {
  id: number
  name: string
  slug: string
  count: number
  description?: string
}

export function parseChapter(raw: RawPost): Chapter {
  const meta = (raw.meta ?? {}) as Record<string, unknown>
  const cats = raw.categories ?? []
  const content = raw.content?.rendered ?? ""
  const images = extractImages(content)

  // Ekstrak seriesSlug dari link post: /manga/[slug]/chapter-X/ → "slug"
  // Contoh link: https://komik7.my.id/manga/one-piece/chapter-1234/
  const link = raw.link ?? ""
  const slugFromLink = link.match(/\/manga\/([^/]+)\//)?.[1] ?? ""

  return {
    id: raw.id,
    title: decodeHtml(raw.title?.rendered ?? ""),
    link,
    date: raw.date ?? "",
    chapterNumber: String(meta["ero_chapter"] ?? meta["chapter_number"] ?? "").trim(),
    seriesTitle: decodeHtml(String(meta["ero_chapter_title"] ?? "")),
    seriesSlug: slugFromLink,
    seriesId: Number.parseInt(String(meta["ero_seri"] ?? "0"), 10) || 0,
    categories: cats,
    categoryId: cats.length > 0 ? cats[0] : 0,
    contentHtml: content,
    thumbnail: images.length > 0 ? images[0] : "/manga-placeholder.png",
    images,
  }
}

/**
 * Parse category dari WP REST API.
 * CATATAN: type & sinopsis yang akurat hanya bisa didapat via scrapeSeriesDetail().
 * parseSeries() hanya untuk data dasar (id, name, slug, count).
 * Untuk halaman detail, selalu panggil scrapeSeriesDetail(slug) terpisah.
 */
export function parseSeries(raw: RawCategory): Series {
  const desc = raw.description ?? ""

  // Cover — kalau ada di description category (legacy)
  let thumbnail: string | undefined
  if (desc.trim().startsWith("http")) {
    thumbnail = desc.split(/\s+/)[0]
  } else {
    const imgs = extractImages(desc)
    if (imgs.length > 0) thumbnail = imgs[0]
  }

  // Sinopsis dari description (fallback — mungkin tidak akurat)
  let sinopsis = desc
  if (sinopsis.startsWith("http")) sinopsis = sinopsis.replace(/^https?:\/\/\S+\s*/, "")
  sinopsis = decodeHtml(sinopsis.replace(/<[^>]+>/g, "").trim())

  return {
    id: raw.id,
    name: decodeHtml((raw.name ?? "").replace(/^Komik\s+/i, "")),
    slug: raw.slug ?? "",
    count: raw.count ?? 0,
    description: sinopsis || undefined,
    thumbnail: thumbnail,
    // mangaType sengaja tidak diisi di sini — pakai scrapeSeriesDetail()
  }
}

async function fetchJson(url: string): Promise<{ data: unknown; res: Response }> {
  const res = await fetch(url, { headers: { Accept: "application/json" } })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  const data = await res.json()
  return { data, res }
}

export const fetcher = async (url: string) => {
  const { data } = await fetchJson(url)
  return data
}

// ─── Series functions ─────────────────────────────────────────────────────────

const POST_FIELDS = "id,title,link,date,meta,categories,content"

/**
 * Ambil detail series via /api/scrape-detail (server route).
 * Dipanggil dari client (useSWR) — server yang akses komik7.my.id,
 * sehingga tidak kena blokir CORS/hotlink dari browser.
 */
async function fetchSeriesDetail(slug: string): Promise<ScrapedSeriesDetail> {
  try {
    const res = await fetch(`/api/scrape-detail?slug=${encodeURIComponent(slug)}`)
    if (!res.ok) return {}
    return await res.json()
  } catch {
    return {}
  }
}

function applyDetail(base: Series, detail: ScrapedSeriesDetail): Series {
  return {
    ...base,
    mangaType: detail.mangaType,
    description: detail.sinopsis || base.description,
    thumbnail: detail.thumbnail || base.thumbnail,
    score: detail.score,
    status: detail.status,
    author: detail.author,
    artist: detail.artist,
    genres: detail.genres
      ? detail.genres.map((name, i) => ({
          id: i,
          name,
          slug: name.toLowerCase().replace(/\s+/g, "-"),
          count: 0,
        }))
      : undefined,
  }
}

/**
 * Single series by slug — data dasar dari WP API + scrape detail via server route.
 * Ini fungsi UTAMA untuk halaman detail komik.
 */
export async function getSeriesBySlug(slug: string): Promise<Series> {
  const url = `${API_BASE}/categories?slug=${encodeURIComponent(slug)}&per_page=1`
  const data = await fetcher(url)
  const arr = data as RawCategory[]
  if (!arr.length) throw new Error(`Series "${slug}" tidak ditemukan`)
  const base = parseSeries(arr[0])
  const detail = await fetchSeriesDetail(slug)
  return applyDetail(base, detail)
}

export async function getSeries(id: number): Promise<Series> {
  const url = `${API_BASE}/categories/${id}`
  const data = await fetcher(url)
  const base = parseSeries(data as RawCategory)
  if (base.slug) {
    const detail = await fetchSeriesDetail(base.slug)
    return applyDetail(base, detail)
  }
  return base
}

export async function getAllSeries(perPage = 100, page = 1): Promise<Series[]> {
  const url = `${API_BASE}/categories?per_page=${perPage}&page=${page}&orderby=count&order=desc&hide_empty=true&exclude=1`
  const data = await fetcher(url)
  // Untuk list, kita tidak scrape satu-satu (terlalu banyak request)
  // mangaType & sinopsis akurat hanya tersedia saat buka detail
  return (data as RawCategory[]).map(parseSeries)
}

export async function getSeriesPage(page = 1, perPage = 24) {
  const url = `${API_BASE}/categories?per_page=${perPage}&page=${page}&orderby=count&order=desc&hide_empty=true&exclude=1`
  const { data, res } = await fetchJson(url)
  const totalPages = Number.parseInt(res.headers.get("x-wp-totalpages") ?? "1", 10) || 1
  const series = (data as RawCategory[]).map(parseSeries)
  return { series, totalPages }
}

/**
 * Filter series by type — scrape halaman filter komik7.my.id/manga/?type=Manhwa
 * Karena WP REST API tidak support filter by custom meta 'ero_type'
 */
export async function getSeriesByType(type: string, page = 1, perPage = 24) {
  try {
    const url = `${SITE_BASE}/manga/?order=title&type=${encodeURIComponent(type)}&page=${page}`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error("fetch failed")
    const html = await res.text()

    // Parse kartu series dari HTML
    // Pola dari homepage: href="/manga/[slug]/" + title
    const cardMatches = [...html.matchAll(/href="(https:\/\/komik7\.my\.id\/manga\/([^/]+)\/)"[^>]*>[\s\S]*?<img[^>]+title="([^"]+)"/gi)]
    const seen = new Set<string>()
    const series: Series[] = []
    for (const m of cardMatches) {
      const slug = m[2]
      const name = decodeHtml(m[3])
      if (seen.has(slug) || !slug || slug === "manga") continue
      seen.add(slug)
      series.push({
        id: 0,
        name: name.replace(/^Komik\s+/i, ""),
        slug,
        count: 0,
        mangaType: type,
      })
    }

    // Cek ada next page dari pagination
    const hasNext = html.includes(`/page/${page + 1}`)
    const totalPages = hasNext ? page + 1 : page

    return { series, totalPages }
  } catch {
    // Fallback ke WP API search
    const url = `${API_BASE}/categories?per_page=${perPage}&page=${page}&orderby=count&order=desc&hide_empty=true&exclude=1&search=${type}`
    const { data, res } = await fetchJson(url)
    const totalPages = Number.parseInt(res.headers.get("x-wp-totalpages") ?? "1", 10) || 1
    const series = (data as RawCategory[]).map(parseSeries)
    return { series, totalPages }
  }
}

// ─── Chapter functions ────────────────────────────────────────────────────────
export async function getChaptersByCategory(categoryId: number, perPage = 100): Promise<Chapter[]> {
  // Fetch page 1 dulu untuk tahu total halaman
  const firstUrl = `${API_BASE}/posts?categories=${categoryId}&per_page=${perPage}&page=1&orderby=date&order=desc&_fields=${POST_FIELDS}`
  const { data: firstData, res } = await fetchJson(firstUrl)
  const totalPages = Number.parseInt(res.headers.get("x-wp-totalpages") ?? "1", 10) || 1

  const firstChapters = (firstData as RawPost[]).map(parseChapter)

  if (totalPages <= 1) return firstChapters

  // Fetch sisa halaman secara paralel
  const restPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2)
  const restResults = await Promise.all(
    restPages.map(async (page) => {
      const url = `${API_BASE}/posts?categories=${categoryId}&per_page=${perPage}&page=${page}&orderby=date&order=desc&_fields=${POST_FIELDS}`
      const data = await fetcher(url)
      return (data as RawPost[]).map(parseChapter)
    })
  )

  return [firstChapters, ...restResults].flat()
}
