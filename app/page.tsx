import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { HomeFeed } from "@/components/home-feed"
import { LatestChapters } from "@/components/latest-chapters"

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 py-6">
        <LatestChapters />
        <HomeFeed />
      </main>
      <SiteFooter />
    </div>
  )
}
