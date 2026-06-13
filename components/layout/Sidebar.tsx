'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarCheck, LayoutDashboard, Wallet, BarChart3 } from 'lucide-react'

const nav = [
  { href: '/today', icon: CalendarCheck, label: 'Today' },
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/finance', icon: Wallet, label: 'Finance' },
  { href: '/history', icon: BarChart3, label: 'History' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar-vibrancy flex flex-col w-[200px] shrink-0 h-full select-none">
      {/* Traffic-light padding — macOS titlebar overlay area */}
      <div className="h-[52px] w-full shrink-0" data-tauri-drag-region />

      {/* App name */}
      <div className="px-4 pb-5" data-tauri-drag-region>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Life OS</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-0.5">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href === '/today' && pathname === '/')
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                ${active
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}>
              <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom version */}
      <div className="px-4 py-4">
        <p className="text-[10px] text-muted-foreground/40">v1.0.0</p>
      </div>
    </aside>
  )
}
