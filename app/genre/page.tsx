"use client"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { MANGA_TYPES, type Genre, getGenres } from "@/lib/api"
import Link from "next/link"
import useSWR from "swr"

const BADGE_COLORS = [
  "bg-violet-100 text-violet-700 hover:bg-violet-200",
  "bg-blue-100 text-blue-700 hover:bg-blue-200",
  "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
  "bg-orange-100 text-orange-700 hover:bg-orange-200",
  "bg-pink-100 text-pink-700 hover:bg-pink-200",
  "bg-amber-100 text-amber-700 hover:bg-amber-200",
  "bg-cyan-100 text-cyan-700 hover:bg-cyan-200",
  "bg-rose-100 text-rose-700 hover:bg-rose-200",
]

function color(i: number) {
  return BADGE_COLORS[i % BADGE_COLORS.length]
}

export default function GenrePage() {
  const { data: genres, isLoading } = useSWR<Genre[]>("genres", getGenres, {
    revalidateOnFocus: false,
  })

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:pb-6">

        {/* ── Judul ── */}
        <h1 className="mb-6 text-xl font-bold text-foreground">Jelajahi</h1>

        {/* ── Tipe: Manga / Manhwa / Manhua ── */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Jenis Komik
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {MANGA_TYPES.map((type) => {
              const countryCode = type.slug === "manga" ? "jp" : type.slug === "manhwa" ? "kr" : "cn"
              return (
                <Link
                  key={type.slug}
                  href={`/genre/${type.slug}`}
                  className="group flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                >
                  <img
                    src={`https://flagcdn.com/w80/${countryCode}.png`}
                    alt={type.label}
                    width={40}
                    height={27}
                    className="rounded-sm shadow-sm object-cover"
                  />
                  <span className="text-sm font-semibold text-foreground">{type.label}</span>
                  <span className="text-center text-xs text-muted-foreground">{type.description}</span>
                </Link>
              )
            })}
          </div>
        </section>

        {/* ── Genre List ── */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Genre
          </h2>

          {isLoading && (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton h-8 rounded-full"
                  style={{ width: `${60 + (i % 5) * 20}px` }}
                />
              ))}
            </div>
          )}

          {!isLoading && genres && genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {genres.map((genre, i) => (
                <Link
                  key={genre.id ?? genre.slug}
                  href={`/genre/${genre.slug}`}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${color(i)}`}
                >
                  {genre.name}
                  {genre.count > 0 && (
                    <span className="ml-1.5 text-xs opacity-60">({genre.count})</span>
                  )}
                </Link>
              ))}
            </div>
          )}

          {!isLoading && (!genres || genres.length === 0) && (
            <p className="text-sm text-muted-foreground">Genre tidak tersedia.</p>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
