import type { Metadata, Viewport } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'
import NotificationScheduler from '@/components/notifications/NotificationScheduler'
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var stored=localStorage.getItem('theme');var dark=stored==='dark'||(!stored&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(dark)document.documentElement.classList.add('dark');}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        {/* macOS desktop: sidebar + content */}
        <div className="hidden md:flex" style={{ height: '100dvh', width: '100vw', overflow: 'hidden', background: 'var(--bg)' }}>
          <Sidebar />
          <main style={{ flex: 1, height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
            {/* Traffic lights spacer */}
            <div style={{ height: 52, flexShrink: 0 }} data-tauri-drag-region />
            {/* Content — no maxWidth here; each page controls its own */}
            <div style={{ padding: '0 40px 56px', width: '100%' }}>
              {children}
            </div>
          </main>
        </div>

        {/* Mobile: bottom nav */}
        <div className="md:hidden" style={{ minHeight: '100dvh', paddingBottom: 76, background: 'var(--bg)' }}>
          <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px 16px 0' }}>
            {children}
          </div>
          <BottomNav />
        </div>

        <NotificationScheduler />

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
