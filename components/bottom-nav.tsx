"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { House, Compass, Heart, Clock } from "lucide-react"
import { useFavorites } from "@/lib/storage"
import type { LucideIcon } from "lucide-react"

const ITEMS: {
  href: string
  label: string
  icon: LucideIcon
  match: (p: string) => boolean
  badge?: () => number
}[] = [
  { href: "/",        label: "Home",    icon: House,    match: (p) => p === "/" },
  { href: "/genre",   label: "Explore", icon: Compass,  match: (p) => p.startsWith("/genre") },
  { href: "/favorit", label: "Favorit", icon: Heart,    match: (p) => p.startsWith("/favorit") },
  { href: "/history", label: "History", icon: Clock,    match: (p) => p.startsWith("/history") },
]

export function BottomNav() {
  const pathname = usePathname()
  const { favorites, ready } = useFavorites()

  // Sembunyikan di halaman baca komik
  if (
    pathname.startsWith("/baca/") ||
    pathname.startsWith("/detail/") ||
    pathname.startsWith("/komik/")
  ) return null

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card shadow-[0_-2px_12px_rgba(15,23,42,0.08)] md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {ITEMS.map((item) => {
          const active = item.match(pathname)
          const Icon = item.icon
          const isFavItem = item.href === "/favorit"
          const count = isFavItem && ready ? favorites.length : 0

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={`relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 px-2 transition-all duration-150 ${
                  active ? "py-2.5 text-primary" : "py-3.5 text-muted-foreground"
                }`}
              >
                {active ? (
                  <span className="absolute top-1 h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
                ) : null}

                <div className="relative">
                  <Icon
                    className={`h-6 w-6 transition-transform duration-150 ${active ? "scale-110" : "scale-100"}`}
                    strokeWidth={active ? 2.4 : 2}
                  />
                  {isFavItem && count > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[11px] font-semibold leading-none transition-all duration-150 ${
                    active ? "max-h-4 translate-y-0 opacity-100" : "max-h-0 translate-y-1 overflow-hidden opacity-0"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
