"use client"

import useSWR from "swr"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useEffect, useRef, useState, useCallback } from "react"
import { getChapter, getChaptersByCategory, type Chapter, proxyImage } from "@/lib/api"
import { saveHistory } from "@/lib/storage"
import { ErrorState } from "@/components/states"
import { ChevronLeft, ChevronRight, List } from "lucide-react"

export function Reader({ id }: { id: number }) {
  const router = useRouter()

  // ── 1️⃣  Chapter data ──────────────────────────────────────────────────────
  const {
    data: chapter,
    error,
    isLoading,
    mutate,
  } = useSWR(["chapter", id], () => getChapter(id), { revalidateOnFocus: false })

  const categoryId = chapter?.categoryId ?? 0

  // ── 2️⃣  Sibling chapters (for prev/next nav) ──────────────────────────────
  const { data: siblings } = useSWR(
    categoryId ? ["siblings", categoryId] : null,
    () => getChaptersByCategory(categoryId, 100),
    { revalidateOnFocus: false },
  )

  // ── Intercept tombol back HP → arahkan ke komik-detail ───────────────────
  useEffect(() => {
    if (!chapter) return
    // Tambah state ke history agar popstate terpicu saat back ditekan
    window.history.pushState({ readerBack: true }, "")
    const handlePopState = () => {
      router.replace(`/detail/${chapter.id}`)
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [chapter, router])

  // ── 3️⃣  Save to history when chapter data is loaded ──────────────────────
  useEffect(() => {
    if (!chapter) return
    saveHistory({
      chapterId: chapter.id,
      chapterNumber: chapter.chapterNumber,
      seriesTitle: chapter.seriesTitle || chapter.title,
      seriesId: chapter.categoryId,
      thumbnail: chapter.thumbnail,
    })
  }, [chapter])

  // ── Prev / Next ────────────────────────────────────────────────────────────
  const { prev, next } = useMemo(() => {
    if (!chapter || !siblings) return { prev: null as Chapter | null, next: null as Chapter | null }
    const sorted = [...siblings].sort(
      (a, b) => (Number.parseFloat(a.chapterNumber) || 0) - (Number.parseFloat(b.chapterNumber) || 0),
    )
    const idx = sorted.findIndex((c) => c.id === chapter.id)
    return {
      prev: idx > 0 ? sorted[idx - 1] : null,
      next: idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null,
    }
  }, [chapter, siblings])

  // ── Floating nav visibility ────────────────────────────────────────────────
  const [navVisible, setNavVisible] = useState(true)
  const lastScrollY = useRef(0)
  const lastTapTime = useRef(0)

  const showNav = useCallback(() => setNavVisible(true), [])
  const hideNav = useCallback(() => setNavVisible(false), [])

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      const delta = currentY - lastScrollY.current
      if (delta < -10) showNav()
      else if (delta > 10 && currentY > 80) hideNav()
      lastScrollY.current = currentY
    }

    const handleDoubleTap = (e: TouchEvent) => {
      const now = Date.now()
      if (now - lastTapTime.current < 300) {
        showNav()
        e.preventDefault()
      }
      lastTapTime.current = now
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    document.addEventListener("touchend", handleDoubleTap, { passive: false })
    return () => {
      window.removeEventListener("scroll", handleScroll)
      document.removeEventListener("touchend", handleDoubleTap)
    }
  }, [showNav, hideNav])

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-2 pt-4">
        <div className="mx-auto h-6 w-2/3 animate-pulse rounded bg-muted" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mx-auto aspect-[3/4] w-full max-w-3xl animate-pulse rounded bg-muted" />
        ))}
      </div>
    )
  }

  if (error || !chapter) {
    return <ErrorState message={error ? (error as Error).message : "Chapter tidak ditemukan"} onRetry={() => mutate()} />
  }

  const title = chapter.seriesTitle || chapter.title

  return (
    <div className="relative">
      {/* ── Strip judul — ATAS ────────────────────────────────────────────── */}
      <div
        className={`fixed inset-x-0 top-0 z-50 transition-transform duration-300 ease-in-out ${
          navVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="bg-black/75 backdrop-blur-sm flex items-center gap-2 px-3 py-1.5">
          <Link
            href={`/detail/${chapter.id}`}
            className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
            aria-label="Kembali ke detail komik"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1 min-w-0 text-center">
            <p className="text-[12px] font-bold text-white leading-tight truncate">{title}</p>
            <p className="text-[10px] text-white/55 leading-tight">Chapter {chapter.chapterNumber || "?"}</p>
          </div>
          <div className="flex-shrink-0 w-7" />
        </div>
      </div>

      {/* ── Konten komik ──────────────────────────────────────────────────── */}
      <div className="bg-background">
        <div className="mx-auto flex max-w-3xl flex-col">
          {chapter.images.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              Tidak ada gambar pada chapter ini.
            </p>
          ) : (
            chapter.images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={proxyImage(src) || "/placeholder.svg"}
                alt={`${title} - halaman ${i + 1}`}
                loading="lazy"
                crossOrigin="anonymous"
                className="w-full"
              />
            ))
          )}
        </div>
      </div>

      {/* Padding bawah */}
      <div className="h-20" />

      {/* ── Floating nav — BAWAH ──────────────────────────────────────────── */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-in-out ${
          navVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-card/95 backdrop-blur border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.12)]">
          <div className="mx-auto flex max-w-md items-center justify-between gap-1.5 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
            <button
              onClick={() => prev && router.push(`/baca/${prev.id}`)}
              disabled={!prev}
              className="flex items-center gap-0.5 rounded border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-foreground transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>

            <Link
              href={`/detail/${chapter.id}`}
              className="flex items-center gap-1 rounded bg-secondary px-3 py-1.5 text-[12px] font-medium text-secondary-foreground transition hover:opacity-90"
            >
              <List className="h-3.5 w-3.5" />
              Daftar Chapter
            </Link>

            <button
              onClick={() => next && router.push(`/baca/${next.id}`)}
              disabled={!next}
              className="flex items-center gap-0.5 rounded border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-foreground transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
