"use client"

import useSWR from "swr"
import { useState } from "react"
import { getSeriesPage, type Series } from "@/lib/api"
import { SeriesCard } from "@/components/series-card"
import { CardGridSkeleton, ErrorState } from "@/components/states"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function HomeFeed() {
  const [page, setPage] = useState(1)
  const { data, error, isLoading, mutate } = useSWR(
    ["series-page", page],
    () => getSeriesPage(page, 24),
    { revalidateOnFocus: false },
  )

  const series: Series[] = data?.series ?? []
  const totalPages = data?.totalPages ?? 1

  function changePage(next: number) {
    setPage(next)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <section>
      <div className="section-title mb-5">
        Daftar Komik
      </div>

      {isLoading ? (
        <CardGridSkeleton count={24} />
      ) : error ? (
        <ErrorState message={(error as Error).message} onRetry={() => mutate()} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {series.map((s) => (
              <SeriesCard key={s.id} series={s} />
            ))}
          </div>

          <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
            <button
              onClick={() => changePage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="page-btn"
            >
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </button>
            <span className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => changePage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="page-btn"
            >
              Berikutnya
              <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        </>
      )}
    </section>
  )
}
