import { Reader } from "@/components/reader"

export default async function ReaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <div className="min-h-screen bg-background">
      <Reader id={Number(id)} />
    </div>
  )
}
