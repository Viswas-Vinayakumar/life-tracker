import type { Metadata, Viewport } from 'next'
import './globals.css'
import BottomNav from '@/components/layout/BottomNav'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: 'Life OS — Daily Tracker',
  description: 'Your intelligent personal life tracker',
}

export const viewport: Viewport = {
  themeColor: '#0a0a0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <main className="mx-auto max-w-lg min-h-dvh pb-24">
          {children}
        </main>
        <BottomNav />
        <Toaster position="top-center" theme="dark" richColors />
      </body>
    </html>
  )
}
