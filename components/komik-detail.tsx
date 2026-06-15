"use client"

import useSWR from "swr"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import {
  getChapter,
  getSeries,
  getSeriesBySlug,
  getChaptersByCategory,
  MANGA_TYPES,
  type Chapter,
  type Genre,
  formatDate,
  proxyImage,
} from "@/lib/api"
import { useFavorites, useHistory } from "@/lib/storage"
import { ErrorState } from "@/components/states"
import { ChevronLeft, ChevronRight, Clock, BookOpen, Heart, Star, Tag, CheckCircle2 } from "lucide-react"

type Props =
  | { chapterId: number; seriesSlug?: never }
  | { seriesSlug: string; chapterId?: never }

export function ComikDetail(props: Props) {
  const router = useRouter()

  const { data: chapter } = useSWR(
    props.chapterId ? ["chapter", props.chapterId] : null,
    () => getChapter(props.chapterId!),
    { revalidateOnFocus: false },
  )

  const { data: seriesBySlug } = useSWR(
    props.seriesSlug ? ["series-slug", props.seriesSlug] : null,
    () => getSeriesBySlug(props.seriesSlug!),
    { revalidateOnFocus: false },
  )

  const seriesId =
    seriesBySlug?.id ??
    chapter?.categoryId ??
    chapter?.seriesId ??
    0

  const { data: seriesById } = useSWR(
    seriesId && !seriesBySlug ? ["series", seriesId] : null,
    () => getSeries(seriesId),
    { revalidateOnFocus: false },
  )

  const series = seriesBySlug ?? seriesById

  const { data: chapters, isLoading: chaptersLoading } = useSWR(
    seriesId ? ["chapters", seriesId] : null,
    () => getChaptersByCategory(seriesId, 100),
    { revalidateOnFocus: false },
  )

  // Genre langsung dari scrapeSeriesDetail (via series.genres) — akurat, tanpa fetch tambahan
  const genres: Genre[] = series?.genres ?? []

  const list: Chapter[] = chapters ?? []
  const thumbnail = series?.thumbnail || list[0]?.thumbnail || chapter?.thumbnail
  const firstChapter = list[list.length - 1]
  const lastChapter = list[0]

  const isLoading = !series && (props.chapterId ? !chapter : !seriesBySlug)

  const { isFavorite, toggleFavorite, ready: favReady } = useFavorites()
  const bookmarked = favReady && series ? isFavorite(series.id) : false
  function onToggleFav(e: React.MouseEvent) {
    e.preventDefault()
    if (!series) return
    toggleFavorite({ id: series.id, name: series.name, slug: series.slug, thumbnail, count: series.count })
  }

  return (
    <>
      {/* Back button */}
      <div className="fixed top-0 inset-x-0 z-40 pointer-events-none">
        <div className="pointer-events-auto inline-flex p-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center h-8 w-8 rounded-full bg-black/50 text-white backdrop-blur-sm"
            aria-label="Kembali"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
      </div>

      <section className="pb-28">
        {isLoading ? (
          <HeroSkeleton />
        ) : (
          <>
            {/* ── BANNER — blur hanya dalam max-w-2xl ── */}
            <div className="w-full bg-muted h-36 md:h-44 overflow-hidden">
              <div className="relative mx-auto h-full max-w-2xl overflow-hidden">
                {thumbnail && (
                  <>
                    <img
                      src={proxyImage(thumbnail)}
                      alt=""
                      aria-hidden
                      crossOrigin="anonymous"
                      className="absolute inset-0 h-full w-full object-cover scale-110 blur-sm opacity-40"
                    />
                    <img
                      src={proxyImage(thumbnail)}
                      alt=""
                      aria-hidden
                      crossOrigin="anonymous"
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  </>
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
              </div>
            </div>

            {/* ── KONTEN — dibatasi max-w-2xl di desktop ── */}
            <div className="mx-auto w-full max-w-2xl relative px-4 -mt-10 space-y-4">

              {/* Cover + title row */}
              <div className="flex gap-4 items-end">
                <div className="relative h-28 w-20 md:h-36 md:w-24 shrink-0 overflow-hidden rounded-xl border-2 border-background shadow-xl bg-muted">
                  {thumbnail ? (
                    <img src={proxyImage(thumbnail)} alt={series?.name} crossOrigin="anonymous" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full animate-pulse bg-muted" />
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-1.5 min-w-0 pb-1">
                  <h1 className="text-base md:text-xl font-bold leading-snug text-foreground line-clamp-2">
                    {series?.name ?? "Memuat..."}
                  </h1>
                  {/* Bendera + tipe komik di bawah judul */}
                  <MangaTypeBadge mangaType={series?.mangaType} genres={genres ?? []} />
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {genres && genres.length > 0 &&
                      genres
                        .filter((g) => !MANGA_TYPES.some((t) => t.slug === g.slug.toLowerCase()))
                        .slice(0, 2)
                        .map((g) => (
                          <Link key={g.id} href={`/genre/${g.slug}`} className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
                            {g.name}
                          </Link>
                        ))
                    }
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onToggleFav}
                  aria-label={bookmarked ? "Hapus dari favorit" : "Tambah ke favorit"}
                  aria-pressed={bookmarked}
                  className={`mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all shadow-sm ${bookmarked ? "bg-rose-500 text-white" : "bg-card border border-border text-muted-foreground hover:text-rose-500"}`}
                >
                  <Heart className={`h-4 w-4 ${bookmarked ? "fill-white" : ""}`} strokeWidth={2} />
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: <Star className="h-4 w-4 text-yellow-400" />, label: "Rating", value: series?.score ?? "–" },
                  { icon: <Clock className="h-4 w-4 text-primary" />, label: "Status", value: series?.status ?? "–" },
                  { icon: <BookOpen className="h-4 w-4 text-muted-foreground" />, label: "Chapter", value: `${series?.count || list.length}` },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col items-center gap-1 rounded-xl bg-muted/60 py-3 px-2 text-center border border-border">
                    {s.icon}
                    <span className="text-[10px] text-muted-foreground">{s.label}</span>
                    <span className="text-sm font-bold text-foreground">{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Sinopsis — 2 baris, baca selengkapnya, auto-tutup 5 detik */}
              <SynopsisBlock text={series?.description || ""} />

              {/* Genres */}
              {genres && genres.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Tag className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Genre</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {genres.map((g) => (
                      <Link key={g.id} href={`/genre/${g.slug}`} className="rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary transition-colors">
                        {g.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Daftar Chapter */}
              <ChapterListBlock list={list} isLoading={chaptersLoading} activeChapterId={props.chapterId} />
            </div>
          </>
        )}
      </section>

      {/* ── Floating bottom bar ── */}
      {series && list.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border shadow-[0_-2px_12px_rgba(15,23,42,0.08)]">
          <div className="mx-auto flex max-w-2xl gap-2 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <Link
              href={`/baca/${firstChapter?.id}`}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background py-2.5 text-sm font-medium text-foreground transition hover:border-primary/40"
            >
              <BookOpen className="h-4 w-4" />
              Baca Ch. 1
            </Link>
            <Link
              href={`/baca/${lastChapter?.id}`}
              className="flex flex-[2] items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              <ChevronRight className="h-4 w-4" />
              Baca Terbaru
            </Link>
          </div>
        </div>
      )}
    </>
  )
}


// ── MangaTypeBadge — deteksi dari series.mangaType (slug category) atau tags ──
function MangaTypeBadge({ mangaType, genres }: { mangaType?: string; genres: Genre[] }) {
  const typeFromCategory = mangaType
    ? MANGA_TYPES.find((t) => mangaType.toLowerCase().includes(t.slug))
    : undefined

  const typeFromTags = !typeFromCategory
    ? MANGA_TYPES.find((t) =>
        genres.some((g) =>
          g.slug.includes(t.slug) || g.name.toLowerCase().includes(t.slug)
        )
      )
    : undefined

  const type = typeFromCategory ?? typeFromTags ?? MANGA_TYPES[0]
  const countryCode = type.slug === "manga" ? "jp" : type.slug === "manhwa" ? "kr" : "cn"

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
      <img
        src={`https://flagcdn.com/w40/${countryCode}.png`}
        alt={type.label}
        width={18}
        height={12}
        className="rounded-sm object-cover"
      />
      {type.label}
    </span>
  )
}

// ── SynopsisBlock — 2 baris, baca selengkapnya, auto-tutup 5 detik ──────────
function SynopsisBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isEmpty = !text || text.trim().length === 0

  function handleExpand() {
    setExpanded(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setExpanded(false)
    }, 5000)
  }

  function handleCollapse() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setExpanded(false)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Tag className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Sinopsis</span>
      </div>
      {isEmpty ? (
        <p className="text-sm leading-relaxed text-muted-foreground italic">
          Sinopsis belum tersedia.
        </p>
      ) : (
        <>
          <p
            className={`text-sm leading-relaxed text-muted-foreground transition-all duration-300 ${
              expanded ? "" : "line-clamp-2"
            }`}
          >
            {text}
          </p>
          <button
            onClick={expanded ? handleCollapse : handleExpand}
            className="mt-1 text-xs font-medium text-primary hover:underline"
          >
            {expanded ? "Sembunyikan" : "Baca selengkapnya"}
          </button>
        </>
      )}
    </div>
  )
}

// ── ChapterListBlock — warna hijau untuk chapter yang sudah dibaca ───────────
function ChapterListBlock({
  list,
  isLoading,
  activeChapterId,
}: {
  list: Chapter[]
  isLoading: boolean
  activeChapterId?: number
}) {
  const [showAll, setShowAll] = useState(false)
  const MAX_VISIBLE = 5
  const visible = showAll ? list : list.slice(0, MAX_VISIBLE)

  // Ambil history dari localStorage
  const { history, ready: historyReady } = useHistory()
  const readIds = new Set(historyReady ? history.map((h) => h.chapterId) : [])

  return (
    <div>
      <div className="text-sm font-semibold text-foreground mb-3 pt-1">Daftar Chapter</div>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Belum ada chapter.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {visible.map((c) => {
              const isActive = c.id === activeChapterId
              const isRead = readIds.has(c.id)

              return (
                <Link
                  key={c.id}
                  href={`/baca/${c.id}`}
                  className={`group flex items-center justify-between gap-3 rounded-xl border px-4 py-3.5 transition hover:shadow-sm ${
                    isActive
                      ? "border-primary/50 bg-primary/5"
                      : isRead
                      ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isActive && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    {isRead && !isActive && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    )}
                    <span
                      className={`font-medium text-sm ${
                        isActive
                          ? "text-primary"
                          : isRead
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground group-hover:text-primary"
                      }`}
                    >
                      Chapter {c.chapterNumber || "?"}
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(c.date)}
                  </span>
                </Link>
              )
            })}
          </div>
          {list.length > MAX_VISIBLE && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-3 w-full rounded-xl border border-border bg-muted/60 py-3 text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary transition-colors"
            >
              {showAll ? "Sembunyikan chapter" : `Lihat semua ${list.length} chapter`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

function HeroSkeleton() {
  return (
    <div>
      <div className="h-36 w-full animate-pulse bg-muted" />
      <div className="px-4 -mt-10 space-y-4">
        <div className="flex gap-4 items-end">
          <div className="h-28 w-20 shrink-0 animate-pulse rounded-xl bg-muted border-2 border-background" />
          <div className="flex flex-1 flex-col gap-2 pb-1">
            <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          </div>
          <div className="mb-1 h-9 w-9 animate-pulse rounded-full bg-muted shrink-0" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}
        </div>
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  )
}
