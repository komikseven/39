"use client"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useFavorites, type FavoriteItem } from "@/lib/storage"
import { proxyImage } from "@/lib/api"
import Link from "next/link"
import { Heart, Trash2, BookOpen } from "lucide-react"

function FavCard({ item, onRemove }: { item: FavoriteItem; onRemove: () => void }) {
  const thumb = item.thumbnail ? proxyImage(item.thumbnail) : "/manga-placeholder.png"

  return (
    <div className="group relative">
      <Link
        href={`/komik/${item.slug}`}
        className="card-soft flex flex-col overflow-hidden"
      >
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          <img
            src={thumb}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
          {/* Overlay gradient */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white">
            <BookOpen className="h-3 w-3" />
            <span className="text-xs">{item.count} ch</span>
          </div>
        </div>
        <div className="p-2">
          <p className="line-clamp-2 text-xs font-medium text-foreground">{item.name}</p>
        </div>
      </Link>

      {/* Remove button */}
      <button
        onClick={onRemove}
        title="Hapus dari favorit"
        className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-500"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export default function FavoritPage() {
  const { favorites, removeFavorite, ready } = useFavorites()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 md:pb-6">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500 fill-red-500" />
            <h1 className="text-xl font-bold text-foreground">Favorit</h1>
            {ready && favorites.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {favorites.length}
              </span>
            )}
          </div>
        </div>

        {/* Loading state */}
        {!ready && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="skeleton aspect-[2/3] rounded-xl" />
                <div className="skeleton h-4 w-3/4 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {ready && favorites.length === 0 && (
          <div className="py-20 text-center">
            <Heart className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium text-foreground">Belum ada favorit</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tekan ikon ❤️ di kartu komik untuk menyimpannya di sini.
            </p>
            <Link
              href="/"
              className="btn-primary mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-sm"
            >
              Jelajahi Komik
            </Link>
          </div>
        )}

        {/* Grid */}
        {ready && favorites.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {favorites.map((item) => (
              <FavCard
                key={item.id}
                item={item}
                onRemove={() => removeFavorite(item.id)}
              />
            ))}
          </div>
        )}

        {/* Info storage */}
        {ready && favorites.length > 0 && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Favorit disimpan di perangkat ini (localStorage). Tidak sinkron antar perangkat.
          </p>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
