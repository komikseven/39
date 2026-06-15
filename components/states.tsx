export function CardGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="aspect-[3/4] animate-pulse bg-muted" />
          <div className="space-y-2 p-2.5">
            <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-10 text-center">
      <p className="text-sm font-medium text-destructive">Gagal memuat data</p>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
      {onRetry ? (
        <button
          onClick={onRetry}
          className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Coba lagi
        </button>
      ) : null}
    </div>
  )
}
