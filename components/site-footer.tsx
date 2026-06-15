export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-lg font-bold text-primary">
            KOMIKU
          </span>
          <p className="max-w-md text-sm text-muted-foreground">
            Baca komik dan manga online gratis dengan update terbaru setiap hari.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} KOMIKU. Semua konten milik pemegang hak cipta masing-masing.
          </p>
        </div>
      </div>
    </footer>
  )
}
