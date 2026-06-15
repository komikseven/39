import { ComikDetail } from "@/components/komik-detail"

export default async function KomikPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return (
    <div className="min-h-screen bg-background">
      <ComikDetail seriesSlug={slug} />
    </div>
  )
}
