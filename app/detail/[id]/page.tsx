import { ComikDetail } from "@/components/komik-detail"

export default async function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="min-h-screen bg-background">
      <ComikDetail chapterId={Number(id)} />
    </div>
  )
}
