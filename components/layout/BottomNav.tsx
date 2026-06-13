'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CalendarCheck, BarChart3, Wallet } from 'lucide-react'

const tabs = [
  { href: '/today', icon: CalendarCheck, label: 'Today' },
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/finance', icon: Wallet, label: 'Finance' },
  { href: '/history', icon: BarChart3, label: 'History' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}>
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 pt-2 pb-1">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href === '/today' && pathname === '/')
          return (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-all duration-200 min-w-[64px]
                ${active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'}`}>
              <div className={`relative ${active ? 'scale-110' : ''} transition-transform duration-200`}>
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                {active && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className={`text-[10px] font-medium tracking-wide ${active ? 'text-primary' : ''}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
