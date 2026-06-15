"use client"

import Link from "next/link"
import useSWR from "swr"
import { proxyImage, type Series } from "@/lib/api"
import { useFavorites } from "@/lib/storage"
import { Heart } from "lucide-react"

async function fetchThumbnailBySlug(slug: string): Promise<string> {
  try {
    const res = await fetch(`/api/scrape-detail?slug=${encodeURIComponent(slug)}`)
    if (!res.ok) return "/manga-placeholder.png"
    const data = await res.json()
    return data.thumbnail || "/manga-placeholder.png"
  } catch {
    return "/manga-placeholder.png"
  }
}

export function SeriesCard({ series }: { series: Series }) {
  const { data: thumb } = useSWR(
    series.thumbnail ? null : ["series-thumb-slug", series.slug],
    () => fetchThumbnailBySlug(series.slug),
    { revalidateOnFocus: false, revalidateIfStale: false },
  )

  const { isFavorite, toggleFavorite, ready } = useFavorites()
  const resolved = series.thumbnail || thumb
  const isLoading = !resolved
  const bookmarked = ready && isFavorite(series.id)

  function onToggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    toggleFavorite({
      id: series.id,
      name: series.name,
      slug: series.slug,
      thumbnail: resolved,
      count: series.count,
    })
  }

  return (
    <Link
      href={`/komik/${series.slug}`}
      className="card-soft group flex flex-col overflow-hidden"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-muted">
        {isLoading ? (
          <div className="skeleton h-full w-full" />
        ) : (
          <img
            src={proxyImage(resolved) || "/placeholder.svg"}
            alt={series.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        )}

        {/* Favourite button */}
        <button
          type="button"
          onClick={onToggle}
          aria-label={bookmarked ? `Hapus ${series.name} dari favorit` : `Tambah ${series.name} ke favorit`}
          aria-pressed={bookmarked}
          className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition hover:bg-black/60"
        >
          <Heart
            className={`h-3.5 w-3.5 transition ${bookmarked ? "fill-rose-400 text-rose-400" : "fill-transparent text-white"}`}
            strokeWidth={2.2}
          />
        </button>

        {/* Chapter count badge */}
        <span className="badge-primary absolute right-2 top-2 shadow-sm">
          {series.count} ch
        </span>
      </div>

      <div className="flex flex-1 flex-col p-2.5">
        <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-card-foreground transition group-hover:text-primary md:text-sm">
          {series.name}
        </h3>
      </div>
    </Link>
  )
}
