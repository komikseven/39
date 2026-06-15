"use client"

import Link from "next/link"
import useSWR from "swr"
import { useSearchParams } from "next/navigation"
import { searchSeries, proxyImage, getSeriesThumbnail, type Series } from "@/lib/api"
import { CardGridSkeleton, ErrorState } from "@/components/states"
import { SearchX } from "lucide-react"
import { useFavorites } from "@/lib/storage"
import { Heart } from "lucide-react"

function SearchSeriesCard({ series }: { series: Series }) {
  const { data: thumb } = useSWR(
    series.thumbnail ? null : ["series-thumb", series.id],
    () => getSeriesThumbnail(series.id),
    { revalidateOnFocus: false, revalidateIfStale: false },
  )

  const { isFavorite, toggleFavorite, ready } = useFavorites()
  const resolved = series.thumbnail || thumb
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
        {!resolved ? (
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

export function SearchResults() {
  const params = useSearchParams()
  const query = params.get("q") ?? ""

  const { data, error, isLoading, mutate } = useSWR(
    query ? ["search-series", query] : null,
    () => searchSeries(query, 48),
    { revalidateOnFocus: false },
  )

  const results: Series[] = data ?? []

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <span className="h-5 w-1.5 rounded-full bg-primary" />
        <h1 className="text-lg font-bold text-foreground md:text-xl">
          Hasil pencarian: <span className="text-primary">{query}</span>
        </h1>
        {!isLoading && results.length > 0 && (
          <span className="ml-auto text-sm text-muted-foreground">{results.length} komik</span>
        )}
      </div>

      {!query ? (
        <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Masukkan kata kunci untuk mencari komik.
        </p>
      ) : isLoading ? (
        <CardGridSkeleton count={12} />
      ) : error ? (
        <ErrorState message={(error as Error).message} onRetry={() => mutate()} />
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-10 text-center">
          <SearchX className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Tidak ada hasil untuk &quot;{query}&quot;.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map((s) => (
            <SearchSeriesCard key={s.id} series={s} />
          ))}
        </div>
      )}
    </section>
  )
}
