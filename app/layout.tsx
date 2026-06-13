import type { Metadata, Viewport } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: 'Life OS',
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
        {/* macOS: sidebar layout on wide screens */}
        <div className="hidden md:flex h-screen w-screen overflow-hidden bg-background">
          <Sidebar />
          {/* Content area */}
          <main className="flex-1 h-full overflow-y-auto">
            {/* Traffic-light top padding */}
            <div className="h-[52px] w-full shrink-0 select-none" data-tauri-drag-region />
            <div className="px-8 pb-10 max-w-3xl">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile: bottom nav layout on small screens */}
        <div className="md:hidden min-h-dvh pb-20">
          <main className="max-w-lg mx-auto">
            {children}
          </main>
          <BottomNav />
        </div>

        <Toaster position="top-right" theme="dark" richColors />
      </body>
    </html>
  )
}
