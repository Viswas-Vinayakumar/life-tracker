import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: 'Life OS',
  description: 'Your intelligent life tracking system',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)',  color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Inline theme script runs before paint — no flash */}
      <Script id="theme-init" strategy="beforeInteractive">{`
        (function() {
          try {
            var stored = localStorage.getItem('theme');
            var dark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
            if (dark) document.documentElement.classList.add('dark');
          } catch(e) {}
        })()
      `}</Script>
      <body>
        {/* macOS desktop: sidebar + content */}
        <div className="hidden md:flex" style={{ height: '100dvh', width: '100vw', overflow: 'hidden', background: 'var(--bg)' }}>
          <Sidebar />
          <main style={{ flex: 1, height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
            {/* Title bar padding */}
            <div style={{ height: 52, flexShrink: 0 }} data-tauri-drag-region />
            <div style={{ maxWidth: 720, padding: '0 36px 48px' }}>
              {children}
            </div>
          </main>
        </div>

        {/* Mobile: bottom nav */}
        <div className="md:hidden" style={{ minHeight: '100dvh', paddingBottom: 76, background: 'var(--bg)' }}>
          <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px' }}>
            {children}
          </div>
          <BottomNav />
        </div>

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-1)',
              borderRadius: 'var(--r-lg)',
              boxShadow: 'var(--shadow-lg)',
              fontSize: 13,
            }
          }}
        />
      </body>
    </html>
  )
}
