import { Suspense } from "react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { SearchResults } from "@/components/search-results"
import { CardGridSkeleton } from "@/components/states"

export default function SearchPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Suspense fallback={<CardGridSkeleton count={12} />}>
          <SearchResults />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  )
}
