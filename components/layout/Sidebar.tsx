'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarCheck, CheckSquare, Wallet, BarChart3, Clock, UtensilsCrossed, Activity, Dumbbell } from 'lucide-react'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'
import ProfileModal, { ProfileButton } from '@/components/profile/ProfileModal'

const nav = [
  { href: '/today',     icon: CalendarCheck,    label: 'Today'   },
  { href: '/food',      icon: UtensilsCrossed,  label: 'Food'    },
  { href: '/gym',       icon: Dumbbell,         label: 'Gym'     },
  { href: '/tasks',     icon: CheckSquare,      label: 'Tasks'   },
  { href: '/finance',   icon: Wallet,           label: 'Finance' },
  { href: '/dashboard', icon: BarChart3,        label: 'Stats'   },
  { href: '/history',   icon: Clock,            label: 'History' },
  { href: '/activity',  icon: Activity,         label: 'Log'     },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <>
      <aside className="sidebar flex flex-col shrink-0 h-full select-none" style={{ width: 'var(--sidebar-w)' }}>
        {/* Traffic light spacer */}
        <div style={{ height: 52 }} data-tauri-drag-region />

        {/* Logo + name */}
        <div className="px-4 pb-4 flex items-center gap-2.5" data-tauri-drag-region>
          <Logo size={26} />
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.2px' }}>Life OS</p>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 8px' }} className="space-y-0.5">
          {nav.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href === '/today' && pathname === '/')
            return (
              <Link key={href} href={href} className={`nav-item ${active ? 'active' : ''}`}>
                <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom: profile + theme */}
        <div style={{ padding: '12px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ProfileButton onClick={() => setProfileOpen(true)} />
            <p style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500 }}>v1.0</p>
          </div>
          <ThemeToggle />
        </div>
      </aside>

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </>
  )
}
