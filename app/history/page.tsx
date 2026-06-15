"use client"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useHistory, type HistoryItem } from "@/lib/storage"
import { proxyImage, timeAgo } from "@/lib/api"
import Link from "next/link"
import { Clock, Trash2, BookOpen, X } from "lucide-react"

function HistoryCard({ item, onRemove }: { item: HistoryItem; onRemove: () => void }) {
  const thumb = item.thumbnail ? proxyImage(item.thumbnail) : "/manga-placeholder.png"
  const ago = timeAgo(new Date(item.readAt).toISOString())

  // seriesId is categoryId (number) → use /series/[id] route
  const seriesHref = `/series/${item.seriesId}`

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:border-primary/30 hover:shadow-sm">
      {/* Thumbnail */}
      <Link href={seriesHref} className="shrink-0">
        <div className="relative h-16 w-11 overflow-hidden rounded-lg bg-muted">
          <img
            src={thumb}
            alt={item.seriesTitle}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 overflow-hidden">
        <Link
          href={seriesHref}
          className="block truncate text-sm font-semibold text-foreground hover:text-primary"
        >
          {item.seriesTitle}
        </Link>
        <Link
          href={`/baca/${item.chapterId}`}
          className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <BookOpen className="h-3 w-3" />
          {item.chapterNumber ? `Chapter ${item.chapterNumber}` : "Baca Lagi"}
        </Link>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {ago}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        <button
          onClick={onRemove}
          className="rounded-md p-1 text-muted-foreground opacity-0 transition hover:text-red-500 group-hover:opacity-100"
          title="Hapus dari riwayat"
        >
          <X className="h-4 w-4" />
        </button>
        <Link
          href={`/baca/${item.chapterId}`}
          className="rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          Lanjutkan
        </Link>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const { history, clearHistory, removeHistory, ready } = useHistory()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pb-24 md:pb-6">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Riwayat Baca</h1>
            {ready && history.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {history.length}
              </span>
            )}
          </div>

          {ready && history.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Hapus semua riwayat baca?")) clearHistory()
              }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus Semua
            </button>
          )}
        </div>

        {/* Loading */}
        {!ready && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-xl" />
            ))}
          </div>
        )}

        {/* Empty */}
        {ready && history.length === 0 && (
          <div className="py-20 text-center">
            <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium text-foreground">Belum ada riwayat</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Komik yang kamu baca akan muncul di sini secara otomatis.
            </p>
            <Link
              href="/"
              className="btn-primary mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-sm"
            >
              Mulai Membaca
            </Link>
          </div>
        )}

        {/* List */}
        {ready && history.length > 0 && (
          <>
            <div className="flex flex-col gap-2">
              {history.map((item) => (
                <HistoryCard
                  key={`${item.chapterId}-${item.readAt}`}
                  item={item}
                  onRemove={() => removeHistory(item.chapterId)}
                />
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Riwayat disimpan di perangkat ini. Maks 50 chapter terakhir.
            </p>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
