import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { LatestChapters } from "@/components/latest-chapters"

export const metadata = {
  title: "Chapter Terbaru - KOMIKU",
  description: "Daftar chapter komik terbaru yang baru saja dirilis di KOMIKU.",
}

export default function PostPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <LatestChapters paginated />
      </main>
      <SiteFooter />
    </div>
  )
}
