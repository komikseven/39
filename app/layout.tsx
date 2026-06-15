import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import './globals.css'
import { BottomNav } from '@/components/bottom-nav'

export const metadata: Metadata = {
  title: 'KOMIKU - Baca Komik Online Bahasa Indonesia',
  description:
    'KOMIKU - Baca komik dan manga online gratis dengan update terbaru setiap hari. Koleksi ribuan series populer.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png',  media: '(prefers-color-scheme: dark)'  },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className="bg-background">
      <body className="font-sans antialiased pb-16 md:pb-0">
        {children}
        <BottomNav />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
